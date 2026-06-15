# 審査依頼 tpr-003 ── KIBI Internal ガバナンス監査（KIBI-MAGI 3人格合議）

- 依頼日: 2026-06-13 ｜ 依頼元: 社長室（Sota指示・発行承認）
- 種別: **ガバナンス監査 / READONLY**。対象＝KIBIの**組織設計・契約・運用規程の整合性と健全性**（サイトのコード品質ではない＝それは tpr-001/002）。実装・修正はしない。勧告のみ。
- 審査担当: **MELCHIOR-1（仕様）＋BALTHASAR-2（技術）＋CASPER-3（経営・思想）の3人格合議**。
- 目的: 三社体制（Internal/External/ThirdParty/Contracts）の設計が、宣言どおり機能するか、抜け・矛盾・利益相反・形骸化がないかを独立検証し、改善を勧告する。

## 0. 全人格共通の鉄則
- 与えられた `snapshot/`（統治文書のみ）だけで審査する。snapshot外のKIBI内部・Tier1運用データ（status実データ・財務実数・処方・顧客情報）・Secret値へアクセス/要求しない。
- レポートにSecret値・個人情報・財務実数を書かない。
- 簡潔体・結論先行・正直（未確認は「未確認」と明記）。社長室の自己申告を鵜呑みにせず独立検証。
- **編集権・実装権・承認権はない。勧告のみ。**

## 1. ★情報保護（本件の前提）
本監査はTier1機密の多いInternal全体が対象だが、**統治文書のみ**を供給する（契約 第16条・第20条7項のSota承認に基づく最小共有）。
- **供給する（snapshot/・25ファイル）**：Contracts/全文・Internal/CLAUDE.md（社長室/全社ガイド）・Secretary/rules/（operations・review-gate・coordination-spec・model-policy）・Secretary/templates/・decisions.md（**財務実数はマスク済み**）・External/ThirdParty規約。
- **供給しない（Tier1）**：各部署の実タスク（status実データ）・財務実数・処方/原料・未公開戦略・各部署CLAUDE.md（原価・処方ヒントが散在するため除外。役割レベルの監査が必要なら後続でマスク版を供給）・`_Records/`・`.secrets/`・`Kofukuron23/`。

## 2. 各人格の観点
### MELCHIOR-1（仕様・整合性）
- Contracts群（master-agreement / requirements-definition / role-definitions / security-policy / forms / charter-public）と Secretary/rules（operations / review-gate / coordination-spec / model-policy）の**内部整合**：定義の矛盾・重複・抜け。
- 三社のフロー（発注→実装→監査→審査→受入→統合）が**様式（forms）とロック台帳（locks）で実際に追跡可能か**、欠落ステップがないか。
- 用語・ID規約・変更区分（軽微/中規模/重大）の定義が一意で運用可能か。

### BALTHASAR-2（技術・強制力）
- ガバナンスの**技術的強制力**：単一書き手原則・ボードの機械生成・スナップショット供給・ロック台帳・Git安全規程は、宣言する失敗（同時編集・情報漏洩・ロストアップデート）を実際に防げる設計か。
- **回避経路**：同一マシン上で規約を破れる箇所、検知の抜け（diff照合・違反記録の実効性）。
- 自動化構想（§後述・別ファイル `automation-design-draft.md` があれば参照）の技術的健全性とサーキットブレーカの要否。

### CASPER-3（経営・思想）
- 組織設計が**KIBI憲章（charter-public）/世界観**に奉仕しているか。役割の明確さ・重複・空白。
- **利益相反**：社長室＝内部監査兼任の安全弁（重大変更＝MAGI＋Sota必須）は十分か。CASPER自身がClaude系（社内同門）である構造的限界。
- **人間承認境界**（第20条）の妥当性：自動化を進める場合に、どこで必ず人間（Sota）が止まるべきか。
- 「急がない」哲学と自動化・効率化の野心の両立。

## 3. 提供物（このinbox内・格納済み）
- `snapshot/`（25ファイル）… §1のとおり統治文書のみ（財務実数マスク済み・実Secretなし）。
- 参照：tpr-001/tpr-002 の経緯（必要時のみ・本監査の主対象ではない）。

## 4. 出力（各 `tpr-003/<persona>.md` ＋ `verdict.md`｜forms.md §11準拠）
- 各人格：判定（`APPROVE / APPROVE_WITH_CONDITIONS / RETURN_TO_CLAUDE / ESCALATE_TO_HUMAN / REJECT`）＋所見＋勧告（ガバナンス改善提案）。
- `verdict.md`（合議）：3票集計（**2/3で成立**、`ESCALATE_TO_HUMAN`は1票で成立）。重大なガバナンス欠陥・Sota判断事項を明示。
- 本監査は是正の緊急性より**設計改善の勧告**が主目的。

## 5. 起動運用（推奨：tpr-002と同時にGPTを二重起動しない）
- SotaがChatGPTで MELCHIOR・BALTHASAR を別チャット、Claude別セッションで CASPER を起動し本書＋snapshotを与える。
- **GPT Plus負荷**：MELCHIOR・BALTHASARはGPT。**tpr-002のGPT人格と同時並行は避け**、tpr-002完了後に回すか、まず CASPER（Claude）から着手するのが安全（詳細は社長室の推奨セッション数）。
- 出力は各 `tpr-003/<persona>.md` に保存（社長室代行可・内容改変禁止）。

## 6. 禁止
snapshot外アクセス・Tier1要求・Secret/個人情報/財務実数の記載・実装/修正（勧告のみ）。
