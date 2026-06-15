# Antigravity ── ベンダー規約（External 共通憲章を継承）

担い手＝**Antigravity CLI（`agy`）**。Google の agentic 開発ツール（Gemini 3 系）。**Google 無料アカウント枠**で利用（API課金なし）。本書は `../AGENTS.md`（External 共通憲章）を継承し、矛盾時は `../../Contracts/master-agreement.md` が優先。

## 型・レビュー
- **型＝実装系**（コード・テスト・差分・スクリプト・調査補助）。**Auditor付き**（`Auditor/`＝内部QA）。Worker成果をAuditorが点検 → 最終受入は社長室。

## 利用上の注意（無料枠）
- **週次クォータ＋作業量（work done）で消費**。重いタスクほど早く尽きる。公開プレビュー仕様のため**料金・制限が変わりうる**。
- 枠超過時は当該Orderを**保留（rate-limited）**にし、失敗扱いしない（自動復帰＝`../../Contracts/automation-design-draft.md` §10）。整形・要約は Ollama（無枠）へ退避。

## 起動・発注
- 起動はSota（新ターミナルで `agy` → Google無料アカウントでサインイン）。自セッションで役（Worker/Auditor）を最初に宣言してから動く。
- 発注＝`Orders/ord-antigravity-###`（共通フロー order/inputs/work/audit/decision）。横断の待ち行列＝`../_BACKLOG.md`。

## 鉄則（共通憲章の再掲・要点）
- `../../Internal/`・`../../_Records/`・`../../.secrets/`・`../../Kofukuron23/`・`../../ThirdParty/` は読まない。必要資料は社長室が Order の `inputs/` にスナップショット供給。
- 本番・決済/認証・顧客データ・処方・Tier0 は扱わない（別紙B「外注不可」）。
- 着手宣言・変更一覧・自己点検を `work/` に残す（様式＝`../../Contracts/forms.md`）。

> ※ Antigravity の **MAGI（第三者審査）への組み込みは別件・改訂案**（`../../Contracts/_framework/conventions/magi-composition-draft.md`・契約第14条「重大」＝次tpr審査＋Sota承認）。本書は **External の実装系ベンダー**としての規約であり、MAGI入りとは独立。
