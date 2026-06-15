# Contracts ── 三社共通規程（入口）

KIBIの三社体制（Internal=Claude／External=Codex／ThirdParty=KIBI-MAGI）に共通するルールの正本。全AIはここに拘束される。優先順位：**Sota指示 ＞ Contracts ＞ Internal/Secretary/rules ＞ 各部署CLAUDE.md**。

| 文書 | 内容 | 現行版 |
|---|---|---|
| `master-agreement.md` | **運用契約書**（22条＋権限マトリクス・外注可否） | v0.2 |
| `requirements-definition.md` | 三社体制の要件定義（設計の根拠） | 承認済（2026-06-12） |
| `role-definitions.md` | AI役割定義（MAGI構成含む） | v1.0 |
| `security-policy.md` | 情報保護方針（Tier・共有禁止・マスキング・Git安全） | v1.0 |
| `charter-public.md` | KIBI憲章の公開版抜粋（審査基準用） | v1.0 |
| `forms.md` | 様式集（発注書・宣言・点検・監査・審査・受入） | v1.0 |
| `locks.md` | 作業ロック台帳（書き手=社長室） | 運用中 |
| `changelog.md` | 改訂履歴 | 運用中 |

- 書き込みは社長室のみ（重大改訂はSota承認）。External・ThirdPartyは読み取り専用。
- 発注の記録は `External/Codex/Orders/ord-###/`、審査の記録は `ThirdParty/Cases/tpr-###/`。

## _framework との関係

上表はKIBI版の正本（このインスタンス固有の具体値）。その共通則の上流に、案件非依存の汎用テンプレ `_framework/` がある。KIBI版は _framework を**継承**し、固有値（部署構成・委託先・MAGI構成・Tierしきい値）だけを上書きする。共通則は _framework が正本で、ここで複製しない。

- 枠組みの入口：[_framework/README.md](_framework/README.md)
- 共通規約（命名・単一書き手・ID連番・判定語彙・Tier）：[_framework/conventions/](_framework/conventions/)
- インスタンス設定スキーマ（`instance.config` の固有値定義）：[_framework/instance-config.schema.md](_framework/instance-config.schema.md)
- 自動化・搬送レイヤー（Watcher・headless・通知・承認ゲート）：[_framework/ops/](_framework/ops/)
