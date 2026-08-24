"""
Higgsfield Cloud API のローカルモック実装。

認証情報が無くてもパイプライン全体（submit → poll → download）を試せるよう、
ジョブのライフサイクルをファイルシステム上でシミュレートする。

ライフサイクル（poll_status を呼ぶたびに1段階進む・既定は completed に到達）:
  1回目の poll: queued -> in_progress
  2回目以降の poll: in_progress -> completed（または force_outcome で nsfw/failed）

未検証・接続後に実測で確定: 本モックが模した JSON 形状（status/request_id/assets という
キー名）は実際の Higgsfield Cloud API のレスポンス形状と完全には一致しない可能性がある
（client.py 側の対応するコメントを参照）。あくまで開発中のパイプライン疎通確認用。
"""
import json
import struct
import time
import uuid
import zlib
from pathlib import Path

from . import paths


def _png_chunk(chunk_type, data):
    chunk = chunk_type + data
    return struct.pack(">I", len(data)) + chunk + struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)


def write_placeholder_png(path, width=64, height=64, color=(180, 180, 200)):
    """外部ライブラリ無しで最小の有効な PNG（単色塗り潰し）を書き出す。

    実際の生成物ではなく、パイプライン疎通確認用のプレースホルダー画像。
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8bit depth, color type 2=truecolor RGB
    raw = bytearray()
    row = bytes(color) * width
    for _ in range(height):
        raw.append(0)  # フィルタタイプ 0（none）
        raw.extend(row)
    compressed = zlib.compress(bytes(raw))
    png_bytes = (
        signature
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", compressed)
        + _png_chunk(b"IEND", b"")
    )
    path.write_bytes(png_bytes)
    return path


def _job_dir(request_id, root=None):
    return paths.mock_state_root(root) / request_id


def _write_state(job_dir, state):
    (job_dir / "status.json").write_text(
        json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _read_state(job_dir):
    return json.loads((job_dir / "status.json").read_text(encoding="utf-8"))


def submit_job(model_id, params, force_outcome="completed", root=None):
    """モックジョブを投入する。force_outcome は最終的に到達させたい終端状態
    ("completed" / "nsfw" / "failed") — 返金シナリオのテストに使う。
    """
    if force_outcome not in ("completed", "nsfw", "failed"):
        raise ValueError(f"force_outcome は completed/nsfw/failed のいずれか: {force_outcome}")
    request_id = f"mock-{uuid.uuid4().hex[:12]}"
    job_dir = _job_dir(request_id, root)
    job_dir.mkdir(parents=True, exist_ok=True)
    state = {
        "request_id": request_id,
        "model_id": model_id,
        "params": params,
        "status": "queued",
        "force_outcome": force_outcome,
        "poll_count": 0,
        "created_ts": time.time(),
    }
    _write_state(job_dir, state)
    return {"request_id": request_id, "raw": state}


def poll_status(request_id, root=None):
    job_dir = _job_dir(request_id, root)
    if not job_dir.exists():
        raise FileNotFoundError(f"mock ジョブが見つかりません: {request_id}")
    state = _read_state(job_dir)
    if state["status"] in ("completed", "nsfw", "failed", "cancelled"):
        return {"status": state["status"], "raw": state}

    state["poll_count"] += 1
    if state["poll_count"] == 1:
        state["status"] = "in_progress"
    else:
        state["status"] = state["force_outcome"]
        if state["status"] == "completed":
            asset_path = job_dir / "asset_0.png"
            write_placeholder_png(asset_path)
            state["assets"] = [{"url": f"file://{asset_path}", "local_path": str(asset_path)}]
        else:
            # nsfw / failed はスキル §1 の記述どおり返金対象として扱う（模擬）。
            state["refunded"] = True
    _write_state(job_dir, state)
    return {"status": state["status"], "raw": state}


def download_assets(request_id, dest_dir, root=None):
    job_dir = _job_dir(request_id, root)
    state = _read_state(job_dir)
    if state["status"] != "completed":
        raise RuntimeError(f"ジョブが completed でないためダウンロードできません（現在: {state['status']}）")
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    downloaded = []
    for asset in state.get("assets", []):
        src = Path(asset["local_path"])
        dst = dest / src.name
        dst.write_bytes(src.read_bytes())
        downloaded.append(str(dst))
    return downloaded


def cancel_job(request_id, root=None):
    job_dir = _job_dir(request_id, root)
    state = _read_state(job_dir)
    if state["status"] != "queued":
        raise RuntimeError(f"キャンセルは queued のジョブのみ可能です（現在: {state['status']}）")
    state["status"] = "cancelled"
    _write_state(job_dir, state)
    return {"status": "cancelled", "raw": state}
