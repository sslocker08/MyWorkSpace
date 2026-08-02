"""
Higgsfield Cloud API（接続経路③・開発者向け自前パイプライン用API）の薄いクライアント。

出典: Skills 工房 `higgsfield-agentic-generation` SKILL.md §1・§7-3。
  - ジョブ投入: POST https://platform.higgsfield.ai/{model_id}
  - 認証: ヘッダ `Authorization: Key {key}:{secret}`（cloud.higgsfield.ai で発行）
  - 状態確認: GET https://platform.higgsfield.ai/requests/{request_id}/status
  - 状態: queued / in_progress / completed / nsfw（返金） / failed（返金）
  - キャンセル: queued の間のみ可能
  - 非同期の作法: 生成はサーバー側で継続する。セッションが切れても後で履歴（request_id）
    から回収できる（＝クライアント側タイムアウトでサーバー側ジョブを中断してはならない）。

⚠️ 重要な留保: このスキルは draft であり、上記の多くは実アカウントでの接続実測を経ていない。
本モジュール中で「未検証・接続後に実測で確定」とコメントした箇所は、実際に
HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET を発行してから実測し、必要なら修正すること。
"""
import json
import os
import time
import urllib.error
import urllib.request

# 未検証・接続後に実測で確定: ベースURLの末尾スラッシュ有無・{model_id} の実際の形式
# （例 "higgsfield-ai/soul/standard" のようなスラッシュ入りパスがそのままURLパスに載るか等）
# はスキルの記述からの推定。
API_BASE = "https://platform.higgsfield.ai"

# HTTP リクエスト自体（1回の接続）のタイムアウト。ジョブそのものの完了を待つ時間ではない。
# ジョブは数分かかることがあるが、それは非同期ポーリングで扱う（wait_until_complete 参照）。
CONNECT_TIMEOUT_SECONDS = 30
DOWNLOAD_TIMEOUT_SECONDS = 120

TERMINAL_STATUSES = {"completed", "nsfw", "failed"}
REFUNDED_STATUSES = {"nsfw", "failed"}  # スキル §1: nsfw/failed は返金対象（サーバー側で自動処理と想定・未検証）

HUMAN_TASKS_DOC = "docs/HUMAN-TASKS.md"


class HiggsfieldConfigError(Exception):
    """認証情報（APIキー/シークレット）が未設定の場合のプレースホルダーゲート用例外。

    このプロジェクトでは real モードで鍵が無いときにスタックトレースを見せず、
    このメッセージだけを表示して終了する（CLI 側で捕捉）。
    """


class HiggsfieldAPIError(Exception):
    """Cloud API 呼び出しが失敗した場合（HTTPエラー・接続エラー・想定外レスポンス等）。"""


def get_credentials():
    """環境変数から API キー/シークレットを取得する。無ければ分かりやすい日本語エラーを送出する。

    プレースホルダーゲート: real モードで鍵が無い場合、ここで必ず HiggsfieldConfigError が
    送出される（スタックトレースではなく、人間が読める案内文）。
    """
    key = os.environ.get("HIGGSFIELD_API_KEY")
    secret = os.environ.get("HIGGSFIELD_API_SECRET")
    if not key or not secret:
        raise HiggsfieldConfigError(
            "Higgsfield の API キー/シークレットが未設定です。\n"
            "環境変数 HIGGSFIELD_API_KEY と HIGGSFIELD_API_SECRET を設定してください。\n"
            f"取得手順は {HUMAN_TASKS_DOC} を参照してください（cloud.higgsfield.ai でキーを発行）。\n"
            "鍵が無くても --mode mock または --mode dry-run ならこのブリッジの動作確認ができます。"
        )
    return key, secret


def _auth_headers():
    key, secret = get_credentials()
    # 未検証・接続後に実測で確定: ヘッダ形式 "Authorization: Key {key}:{secret}" はスキルに
    # 明記されているが、区切り文字・大小文字・実際のスキーム名は実測未確認。
    return {
        "Authorization": f"Key {key}:{secret}",
        "Content-Type": "application/json",
    }


def _request(method, url, body=None, timeout=CONNECT_TIMEOUT_SECONDS):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=_auth_headers(), method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        raise HiggsfieldAPIError(f"Higgsfield API が HTTP {e.code} を返しました: {body_text}") from None
    except urllib.error.URLError as e:
        raise HiggsfieldAPIError(f"Higgsfield API への接続に失敗しました: {e.reason}") from None
    except json.JSONDecodeError as e:
        raise HiggsfieldAPIError(f"Higgsfield API のレスポンスが JSON として解釈できません: {e}") from None


def submit_job(model_id, params, timeout=CONNECT_TIMEOUT_SECONDS):
    """ジョブを投入する。POST https://platform.higgsfield.ai/{model_id}

    戻り値: {"request_id": str, "raw": dict}
    """
    get_credentials()  # 鍵が無ければここで HiggsfieldConfigError（ネットワークへは出ない）
    url = f"{API_BASE}/{model_id}"
    # 未検証・接続後に実測で確定: リクエストボディのトップレベル構造
    # （params dict をそのまま POST するか、{"input": {...}} のようにラップするか）は未確認。
    resp = _request("POST", url, body=params, timeout=timeout)
    # 未検証・接続後に実測で確定: レスポンス中の request_id のフィールド名（"request_id" か "id" か）。
    request_id = resp.get("request_id") or resp.get("id")
    if not request_id:
        raise HiggsfieldAPIError(f"レスポンスに request_id/id が見つかりません: {resp}")
    return {"request_id": request_id, "raw": resp}


def poll_status(request_id, timeout=CONNECT_TIMEOUT_SECONDS):
    """GET https://platform.higgsfield.ai/requests/{request_id}/status

    戻り値: {"status": str, "raw": dict}
    status は queued / in_progress / completed / nsfw / failed のいずれかを想定
    （未検証・接続後に実測で確定: 実際の文字列表記・大小文字は skill 記載からの推定）。
    """
    get_credentials()
    url = f"{API_BASE}/requests/{request_id}/status"
    resp = _request("GET", url, timeout=timeout)
    status = resp.get("status")
    return {"status": status, "raw": resp}


def is_refunded(status):
    """nsfw / failed は返金対象という skill の記述に基づく判定ヘルパー。
    未検証・接続後に実測で確定: 実際のレスポンスに専用の refunded フラグがあるかは未確認。
    """
    return status in REFUNDED_STATUSES


def download_assets(request_id, dest_dir, status_payload=None, timeout=DOWNLOAD_TIMEOUT_SECONDS):
    """完了したジョブのアセット（画像/動画）をダウンロードして dest_dir に保存する。

    status_payload を渡さなければ、まず poll_status で最新状態を取得する
    （＝ request_id さえあれば、投入時のセッションが無くても resume 可能）。

    未検証・接続後に実測で確定: 完成アセットの URL がレスポンスのどのフィールドに入るか
    （"assets" / "output" / "outputs" / "result" 等）はスキルに明記が無い。ここでは
    複数の候補フィールド名を順に試す防御的な実装にしている。
    """
    if status_payload is None:
        status_payload = poll_status(request_id, timeout=timeout)
    if status_payload["status"] != "completed":
        raise HiggsfieldAPIError(
            f"ジョブが completed 状態ではないためダウンロードできません（現在: {status_payload['status']}）。"
        )
    raw = status_payload.get("raw", {})
    assets = raw.get("assets") or raw.get("output") or raw.get("outputs") or raw.get("result") or []
    if isinstance(assets, dict):
        assets = [assets]

    from pathlib import Path
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)

    downloaded = []
    for i, asset in enumerate(assets):
        if isinstance(asset, dict):
            asset_url = asset.get("url") or asset.get("asset_url") or asset.get("download_url")
        else:
            asset_url = asset
        if not asset_url:
            continue
        filename = asset_url.rstrip("/").rsplit("/", 1)[-1] or f"asset_{i}"
        out_path = dest / filename
        req = urllib.request.Request(asset_url, headers=_auth_headers())
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                out_path.write_bytes(resp.read())
        except urllib.error.URLError as e:
            raise HiggsfieldAPIError(f"アセットのダウンロードに失敗しました ({asset_url}): {e}") from None
        downloaded.append(str(out_path))
    return downloaded


def cancel_job(request_id, timeout=CONNECT_TIMEOUT_SECONDS):
    """queued 中のジョブのみキャンセル可能（スキル §1）。他の状態では拒否する。"""
    get_credentials()
    current = poll_status(request_id, timeout=timeout)
    if current["status"] != "queued":
        raise HiggsfieldAPIError(
            f"キャンセルは queued 状態のジョブのみ可能です（現在の状態: {current['status']}）。"
        )
    # 未検証・接続後に実測で確定: キャンセル用エンドポイントのパスはスキルに
    # 「queued 中のみ POST .../cancel 可」と記載があるのみで、正確なパスは未確認。
    url = f"{API_BASE}/requests/{request_id}/cancel"
    resp = _request("POST", url, body={}, timeout=timeout)
    return {"status": "cancelled", "raw": resp}


def wait_until_complete(request_id, poll_interval_seconds=10, max_wait_seconds=None, on_poll=None):
    """非同期ジョブが終端状態になるまでポーリングする。

    重要: max_wait_seconds に到達しても、サーバー側のジョブを cancel しない。
    ローカルの待機を諦めて非終端の最新状態を返すだけであり、後から同じ request_id で
    resume（再度 poll_status / download_assets を呼ぶ）できる
    （スキル §7-3「非同期の作法」＝セッションが切れてもサーバー側は継続）。
    """
    start = time.monotonic()
    while True:
        result = poll_status(request_id)
        if on_poll is not None:
            on_poll(result)
        if result["status"] in TERMINAL_STATUSES:
            return result
        if max_wait_seconds is not None and (time.monotonic() - start) >= max_wait_seconds:
            return result  # まだ非終端。cancel はしない。request_id で後から resume 可能。
        time.sleep(poll_interval_seconds)
