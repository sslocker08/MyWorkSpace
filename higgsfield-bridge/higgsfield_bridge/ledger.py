"""
クレジット使用台帳（ledger）。

Higgsfield のモデル別クレジット消費表は公式未公開・第三者の数値は桁レベルで矛盾している
（出典: `higgsfield-agentic-generation` SKILL.md §6「モデル別消費表は公式未公開。第三者の
数値は桁レベルで矛盾（Kling 3.0 が『6』と『50』等）＝信用しない。実測が正」）。

したがって本モジュールはジョブ1件につき1行の JSONL を ledger/usage.jsonl に追記し、
credits_estimated / credits_actual は当面 null のまま記録しておく。実際の残高差分から
実測値を得たら、その値で別途 credits_actual を埋めるのが正しい運用（本モジュールは
その「測るための台帳」であり、消費予測モデルそのものは持たない）。
"""
import hashlib
import json
import time

from . import paths


def params_hash(params):
    """パラメータ dict を安定した短いハッシュにする（キー順序に依存しない）。"""
    encoded = json.dumps(params, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def append_entry(model_id, params, status, request_id,
                  credits_estimated=None, credits_actual=None, root=None):
    """ジョブ1件につき1行、ledger/usage.jsonl に追記する。"""
    entry = {
        "ts": time.time(),
        "model_id": model_id,
        "params_hash": params_hash(params),
        "credits_estimated": credits_estimated,  # 公式非公開のため既定は null（スキル §6）
        "credits_actual": credits_actual,          # 実測後に別途埋める想定の placeholder
        "status": status,
        "request_id": request_id,
    }
    path = paths.ledger_file(root)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def read_entries(root=None):
    path = paths.ledger_file(root)
    if not path.exists():
        return []
    entries = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


def build_report(root=None):
    """モデル別の件数・ステータス内訳・実測クレジット合計（判明分のみ）を集計する。"""
    entries = read_entries(root)
    per_model = {}
    for e in entries:
        model_id = e.get("model_id", "unknown")
        bucket = per_model.setdefault(
            model_id,
            {"count": 0, "by_status": {}, "credits_actual_known": 0, "credits_actual_sum": 0},
        )
        bucket["count"] += 1
        status = e.get("status", "unknown")
        bucket["by_status"][status] = bucket["by_status"].get(status, 0) + 1
        if e.get("credits_actual") is not None:
            bucket["credits_actual_known"] += 1
            bucket["credits_actual_sum"] += e["credits_actual"]
    return {"total_jobs": len(entries), "per_model": per_model}


def format_report(report):
    lines = [f"総ジョブ数: {report['total_jobs']}", ""]
    if not report["per_model"]:
        lines.append("（台帳は空です。ジョブを実行すると記録されます）")
        return "\n".join(lines)
    for model_id, bucket in sorted(report["per_model"].items()):
        lines.append(f"- {model_id}: {bucket['count']} 件")
        for status, count in sorted(bucket["by_status"].items()):
            lines.append(f"    {status}: {count}")
        if bucket["credits_actual_known"] > 0:
            lines.append(
                f"    実測クレジット合計: {bucket['credits_actual_sum']}"
                f"（実測済み {bucket['credits_actual_known']} 件・残りは未計測）"
            )
        else:
            lines.append("    実測クレジット: 未計測（credits_actual が null のまま。公式消費表は非公開）")
    return "\n".join(lines)
