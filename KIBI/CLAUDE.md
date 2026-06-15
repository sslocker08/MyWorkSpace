# KIBI ── 全社構成（三社体制）

ここはKIBIインスタンスのルート（運用基盤ワークスペース上の `MyWorkSpace/KIBI/`）。**作業席ではない**（席はこの下の各領域で開く）。KIBIは2026-06-12からInternal（社内＝Claude）／External（外注＝Codex）／ThirdParty（中立審査＝KIBI-MAGI）の三社体制で運営される。共通規程の正本はこのインスタンス直下の `Contracts/`。ツール・契約テンプレ・規約など案件横断で共有する枠組みは親階層の `_framework/`（移行前は `Contracts/_framework/` に起案中）にあり、各インスタンスはそれを継承して固有値を `instance.config` と `Contracts/` で具体化する。

## 領域マップ

| 領域 | 担い手 | 中身 | 席の開き方 |
|---|---|---|---|
| `Internal/` | Claude（社内） | 社長室（直下）＋10部署。設計・判断・統合のすべて | 社長室＝`cd Internal && claude`／部署＝`cd Internal/<部署> && claude` |
| `External/` | Codex（外注） | Worker（実装）・Auditor（内部QA）・Orders（発注記録 ord-###） | `cd External && codex`（規約＝`External/AGENTS.md`） |
| `ThirdParty/` | KIBI-MAGI（中立） | 3観点合議の独立審査（Cases/tpr-###）。読み取り専用・勧告のみ | 構成・規約＝`ThirdParty/README.md` |
| `Contracts/` | 三社共通 | 運用契約書・役割定義・情報保護・ロック台帳・様式 | 入口＝`Contracts/README.md` |

## 不可侵領域（全AI共通）
- `_Records/` … 販売記録の正本（個人情報。Git・共有対象外）
- `.secrets/` … 認証情報（Git管理外）
- `Kofukuron23/` … 社長個人の外部プロジェクト（KIBI業務のスコープ外。社長の直接指示時のみ）

## 基本原則
- 優先順位：**Sota（社長）指示 ＞ `Contracts/` ＞ `Internal/Secretary/rules/` ＞ 各部署CLAUDE.md**。
- 発注できるのは社長室のみ。External・ThirdPartyはInternalを直接読まない（スナップショット供給＝`Contracts/security-policy.md`）。
- 同時編集の禁止・編集権限・受入フローの正本＝`Contracts/master-agreement.md`。
- Git：運用基盤の統治リポジトリは private な `sslocker08/MyWorkSpace` へ移行予定（このKIBIインスタンスは `MyWorkSpace/KIBI/` として収容）。除外＝上記不可侵領域。Webサイト（`Internal/System/`）は引き続き別リポジトリ `kibi-fragrance`（submodule 扱い）。移行は不可逆のため Sota の合図待ち。

この席（ルート）で会話を開いた場合は、全社構成の案内と `Internal/` への誘導のみ行い、部署業務・発注・統合は行わない。
