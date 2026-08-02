"""
アンカーフレーム承認フロー（静止画を先に安く生成→人間が承認→承認後にのみ動画化）。

出典: `higgsfield-agentic-generation` SKILL.md §7-1「アンカーフレーム承認→動画化:
静止画（安い）を先に生成して人間/評価器が承認 → 承認後にのみ i2v（高い）。却下コストを
静止画側に寄せる（実例で約4倍のクレジット節約主張・単一ソース＝未検証）」。

ファイルベースの状態遷移（anchors/<name>/ 配下）:
  job.json         アンカー（静止画）ジョブのメタデータ（request_id・model_id・params等）
  anchor.png       承認対象として保存された静止画
  APPROVED         人間が承認した合図ファイル（承認日時・メモを含む）
  video_job.json   承認後に投入した動画ジョブのメタデータ

状態（get_state が返す）:
  seed              -> ディレクトリ/ジョブ未作成
  anchor_submitted   -> job.json はあるが anchor.png 未取得（real モードで未完了の間）
  anchor_ready       -> anchor.png あり・APPROVED なし（人間の承認待ち）
  approved           -> APPROVED ファイルあり（動画投入前）
  video_submitted    -> video_job.json あり（完了）

承認 (approve) は「観測可能なファイルの存在」でしか表現されない、意図的にシンプルな
ゲートである。approve() を呼ばない限り submit_video() は必ず例外を送出する。
"""
import base64
import json
import time
from pathlib import Path

from . import client, ledger, mock, paths

SEED = "seed"
ANCHOR_SUBMITTED = "anchor_submitted"
ANCHOR_READY = "anchor_ready"
APPROVED = "approved"
VIDEO_SUBMITTED = "video_submitted"


class AnchorNotReadyError(Exception):
    """anchor.png がまだ無い状態で承認しようとした場合。"""


class AnchorNotApprovedError(Exception):
    """承認 (APPROVED ファイル) が無い状態で動画ジョブを投入しようとした場合。"""


def anchor_dir(name, root=None):
    d = paths.anchors_root(root) / name
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_state(name, root=None):
    d = anchor_dir(name, root)
    if (d / "video_job.json").exists():
        return VIDEO_SUBMITTED
    if (d / "APPROVED").exists():
        return APPROVED
    if (d / "anchor.png").exists():
        return ANCHOR_READY
    if (d / "job.json").exists():
        return ANCHOR_SUBMITTED
    return SEED


def _write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def submit_anchor(name, model_id, params, mode="mock", root=None):
    """安価な静止画（アンカー）ジョブを投入する。

    mock: その場で completed まで進めて anchor.png を保存する（同期的・決定的）。
    real: 投入のみ行う。完了は poll_anchor(mode="real") で進める必要がある
          （ジョブはサーバー側で継続するため、このプロセスがすぐ終わっても問題ない）。
    dry-run: 送信予定の内容を表示するだけで、状態は変化させない。
    """
    if mode == "dry-run":
        print(f"[dry-run] anchor submit: name={name} model_id={model_id} params={params}")
        return get_state(name, root)

    d = anchor_dir(name, root)
    if mode == "mock":
        result = mock.submit_job(model_id, params, root=root)
    elif mode == "real":
        result = client.submit_job(model_id, params)
    else:
        raise ValueError(f"未知の mode: {mode}")

    request_id = result["request_id"]
    job = {
        "name": name,
        "model_id": model_id,
        "params": params,
        "request_id": request_id,
        "mode": mode,
        "kind": "anchor",
        "status": "queued",
        "submitted_ts": time.time(),
    }
    _write_json(d / "job.json", job)
    ledger.append_entry(model_id, params, "queued", request_id, root=root)

    if mode == "mock":
        _advance_mock_anchor(name, root)

    return get_state(name, root)


def _advance_mock_anchor(name, root=None):
    """mock モードのアンカージョブを completed（または force_outcome の終端）まで進める。"""
    d = anchor_dir(name, root)
    job = _read_json(d / "job.json")
    request_id = job["request_id"]
    result = mock.poll_status(request_id, root=root)
    while result["status"] not in ("completed", "nsfw", "failed"):
        result = mock.poll_status(request_id, root=root)
    job["status"] = result["status"]
    if result["status"] == "completed":
        downloaded = mock.download_assets(request_id, d, root=root)
        if downloaded:
            src = Path(downloaded[0])
            (d / "anchor.png").write_bytes(src.read_bytes())
    _write_json(d / "job.json", job)


def poll_anchor(name, mode="real", root=None):
    """real モードでアンカージョブの完了を待つ（呼ぶたびに1回サーバーへ問い合わせる）。

    mode="mock" の場合は _advance_mock_anchor と同じ効果（テスト・手動確認用）。
    """
    d = anchor_dir(name, root)
    job = _read_json(d / "job.json")

    if mode == "mock":
        _advance_mock_anchor(name, root)
        return get_state(name, root)

    if mode != "real":
        raise ValueError(f"poll_anchor は mode='real' か 'mock' のみ対応: {mode}")

    result = client.poll_status(job["request_id"])
    job["status"] = result["status"]
    if result["status"] == "completed":
        downloaded = client.download_assets(job["request_id"], d, status_payload=result)
        if downloaded:
            src = Path(downloaded[0])
            (d / "anchor.png").write_bytes(src.read_bytes())
    _write_json(d / "job.json", job)
    return get_state(name, root)


def approve(name, root=None, note=""):
    """人間の承認を記録する。anchor.png が無い状態では承認できない（順序ガード）。"""
    state = get_state(name, root)
    if state != ANCHOR_READY:
        raise AnchorNotReadyError(
            f"'{name}' はまだ承認できる状態ではありません（現在の状態: {state}）。"
            "anchor.png が生成されてから承認してください"
            "（real モードなら先に anchor poll でジョブ完了を進めてください）。"
        )
    d = anchor_dir(name, root)
    _write_json(d / "APPROVED", {"approved_ts": time.time(), "note": note})
    return get_state(name, root)


def is_approved(name, root=None):
    return (anchor_dir(name, root) / "APPROVED").exists()


def submit_video(name, model_id, params, mode="mock", root=None):
    """承認済みのアンカーを参照して動画ジョブを投入する。未承認なら必ず例外を送出する。"""
    if not is_approved(name, root):
        raise AnchorNotApprovedError(
            f"'{name}' はまだ承認されていません。先に `anchor approve --name {name}` を実行してください。"
        )

    d = anchor_dir(name, root)
    anchor_png = d / "anchor.png"
    video_params = dict(params)

    # 未検証・接続後に実測で確定: Cloud API が「アンカー画像を参照して動画化する」際に
    # どのフィールド名・形式（base64 インライン／事前アップロード後のURL参照／multipart等）
    # でリファレンス画像を受け取るかはスキルに一次記載が無い。ここでは暫定として
    # base64 データURIを "reference_image" というフィールド名に入れているが、
    # 実際のモデル別パラメータ仕様は cloud.higgsfield.ai のドキュメント・実測で確定させること。
    if anchor_png.exists() and "reference_image" not in video_params:
        b64 = base64.b64encode(anchor_png.read_bytes()).decode("ascii")
        video_params["reference_image"] = f"data:image/png;base64,{b64}"

    if mode == "dry-run":
        print(f"[dry-run] video submit: name={name} model_id={model_id} anchor={anchor_png}")
        return get_state(name, root)

    if mode == "mock":
        result = mock.submit_job(model_id, video_params, root=root)
    elif mode == "real":
        result = client.submit_job(model_id, video_params)
    else:
        raise ValueError(f"未知の mode: {mode}")

    request_id = result["request_id"]
    job = {
        "name": name,
        "model_id": model_id,
        "params": video_params,
        "request_id": request_id,
        "mode": mode,
        "kind": "video",
        "status": "queued",
        "submitted_ts": time.time(),
    }
    _write_json(d / "video_job.json", job)
    ledger.append_entry(model_id, video_params, "queued", request_id, root=root)
    return get_state(name, root)
