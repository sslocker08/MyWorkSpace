#!/usr/bin/env bash
# KIBI 三社フロー パイプライン薄ラッパ（run-pipeline）
# 設計正本: Contracts/automation-design-draft.md §5（launchd 定期 headless 実行）。
# 役割: orders-scan.js → pipeline-notify.js を「この順で」呼ぶだけの薄いラッパ。
#   1) orders-scan.js  … Order/Case を走査し dashboard/_pipeline.json を更新
#   2) pipeline-notify.js … _pipeline.json を読み、変化があれば Slack へ digest 通知
# 設置/有効化は Sota 承認後（README.md 参照）。本スクリプト単体では何も自動実行しない。
#
# 制約（鉄則）:
#   - 新規 npm 依存なし。実行は node 標準のみ（呼ぶ2スクリプトが Node 標準のみで完結）。
#   - Secret 実値を書かない。SLACK_WEBHOOK_URL は呼び出し元 env から継承するだけ（plist で注入）。
#   - 個人情報・実データに触れない（呼ぶ2スクリプトがメタのみ走査）。
#
# 終了コード（cron/launchd 側で検知できるよう非ゼロを握りつぶさない）:
#   0   … 両ステップ正常（通知は変化があれば送信、無ければ抑止）
#   2   … orders-scan が競合/要人間承認(exit 2) を検出、または notify が送信失敗(exit 2)
#         （＝「人間が見るべき変化あり」。どちらの 2 でも 2 を伝播）
#   1   … 走査エラー / 想定外エラー（orders-scan exit 1 など）
#   その他 … 最後に失敗したステップの終了コードをそのまま伝播
#
# 使い方:
#   bash Internal/Secretary/tools/ops/run-pipeline.sh            … scan→notify を実行
#   DRY=1 bash .../run-pipeline.sh                               … notify を Slack へ投げず stdout（試走）
#   引数はそのまま orders-scan.js へ渡す（例: --no-write は notify 用 json が出ないため非推奨）。

set -u
set -o pipefail

# ── パス解決（このスクリプトの位置から相対で確定。WorkingDirectory に依存しない）──
# このファイル: Internal/Secretary/tools/ops/run-pipeline.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../tools/ops
TOOLS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"                  # .../tools
SECRETARY_DIR="$(cd "${TOOLS_DIR}/.." && pwd)"               # .../Secretary

SCAN_JS="${TOOLS_DIR}/orders-scan.js"
NOTIFY_JS="${TOOLS_DIR}/pipeline-notify.js"
PIPELINE_JSON="${SECRETARY_DIR}/dashboard/_pipeline.json"

# ログ: 既定は Secretary/tools/ops/logs/run-pipeline.log（plist の StandardOut/ErrPath とは別の自前タイムスタンプ行）。
# RUN_PIPELINE_LOG で上書き可。書けない環境でもラッパは止めない（ログは best-effort）。
LOG_DIR="${RUN_PIPELINE_LOG_DIR:-${SCRIPT_DIR}/logs}"
LOG_FILE="${RUN_PIPELINE_LOG:-${LOG_DIR}/run-pipeline.log}"

NODE_BIN="${NODE_BIN:-node}"

# ── ログ出力（stderr とログファイルへ。Secret は出さない）──
log() {
  local ts msg
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  msg="[run-pipeline ${ts}] $*"
  printf '%s\n' "${msg}" >&2
  { mkdir -p "${LOG_DIR}" 2>/dev/null && printf '%s\n' "${msg}" >>"${LOG_FILE}" 2>/dev/null; } || true
}

fail_exit() {
  # $1=終了コード $2=メッセージ
  log "ERROR: $2 (exit $1)"
  exit "$1"
}

# ── 前提チェック（依存スクリプト・node の存在）──
command -v "${NODE_BIN}" >/dev/null 2>&1 || fail_exit 1 "node が見つからない（NODE_BIN=${NODE_BIN}）"
[ -f "${SCAN_JS}" ]   || fail_exit 1 "orders-scan.js が無い: ${SCAN_JS}"
[ -f "${NOTIFY_JS}" ] || fail_exit 1 "pipeline-notify.js が無い: ${NOTIFY_JS}"

log "start (scan→notify) tools=${TOOLS_DIR}"

# ── ステップ1: orders-scan.js（_pipeline.json を更新）──
# 引数($@)はそのまま scan へ。scan の終了コード: 0=正常 / 2=競合 or 要人間承認 / 1=走査エラー。
"${NODE_BIN}" "${SCAN_JS}" "$@"
SCAN_RC=$?
if [ "${SCAN_RC}" -eq 1 ]; then
  # 走査エラーは致命。notify を呼んでも古い json で誤通知しかねないので中断。
  fail_exit 1 "orders-scan が走査エラー (exit 1)。notify をスキップ。"
fi
log "orders-scan done (exit ${SCAN_RC} : 0=正常 / 2=競合or要人間承認)"

# ── ステップ2: pipeline-notify.js（_pipeline.json を読み Slack 通知）──
# notify の終了コード: 0=正常(送信 or 抑止 or fail-safe) / 2=Slack 送信失敗。
"${NODE_BIN}" "${NOTIFY_JS}" "${PIPELINE_JSON}"
NOTIFY_RC=$?
log "pipeline-notify done (exit ${NOTIFY_RC} : 0=送信/抑止/fail-safe, 2=送信失敗)"

# ── 終了コード合成（人間が見るべき事象を優先して伝播）──
# notify 送信失敗(2)は運用上の最重要シグナル → 最優先で 2。
if [ "${NOTIFY_RC}" -eq 2 ]; then
  fail_exit 2 "pipeline-notify が Slack 送信失敗。"
fi
# 続いて scan の 2（競合/要人間承認）。これは「正常に検知できた」ので運用上は要人間として 2 を返す。
if [ "${SCAN_RC}" -eq 2 ]; then
  log "orders-scan が競合/要人間承認を検出 (exit 2 を伝播)。"
  exit 2
fi
# notify がその他の非ゼロ（想定外）ならそのまま伝播。
if [ "${NOTIFY_RC}" -ne 0 ]; then
  fail_exit "${NOTIFY_RC}" "pipeline-notify が想定外終了。"
fi

log "ok (all clear)"
exit 0
