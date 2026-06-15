# 審査依頼 tpr-002 ── tpr-001是正の再審査（KIBI-MAGI 3人格合議）

> **【round-2 再供給 2026-06-13】** round-1はsnapshotに `assets/js`（main.js/analytics.js）欠落で差し戻し（verdict）。本round-2で**フロントJS5本＋法務本文＋差分(diff-assets)を同梱**し、round-1指摘T2-002/004是正＋T2-003(canceled追加)も反映済み。対象commit=40d68cb。

- 依頼日: 2026-06-13 ｜ 依頼元: 社長室（Sota指示）
- 種別: **再審査（re-review）/ READONLY**。対象＝tpr-001是正後の `kibi-fragrance.jp`（branch `security/tpr-001`）。実装・修正はしない。勧告のみ。
- 審査担当: **BALTHASAR-2（技術）＋MELCHIOR-1（仕様）＋CASPER-3（経営・思想）の3人格合議**（tpr-001はBALTHASAR単独だったが、本件はSota指示で3人格）。
- 目的: 本是正を**本番デプロイしてよいか**の独立判定。判定が APPROVE / APPROVE_WITH_CONDITIONS なら、Sota承認のうえ `netlify deploy --prod` へ進む。
- 基準文書: `../../../Contracts/charter-public.md`・`../../../Contracts/master-agreement.md`・tpr-001レポート（`../../tpr-001/balthasar.md`）・統合判定（snapshotの `TPR-001_REMEDIATION.md`）。

## 0. 全人格共通の鉄則
- 与えられた `snapshot/`（是正後ソース）と `evidence/`（差分・node --check 等）だけで審査する。snapshot外のKIBI内部・本番Secret値・顧客データへアクセス/要求しない。
- レポートにSecret値・鍵・個人情報を書かない（値は伏せ、場所と種別のみ）。
- 簡潔体・結論先行・正直（未確認は「未確認」と明記）。実装者/社長室の自己申告を鵜呑みにせず独立検証。
- **編集権・実装権・承認権はない。勧告のみ。**

## 1. 是正の対象（tpr-001の全指摘＋新規B-017）
B-001〜B-016（High4/Medium9/Low3）＋ B-017（QA班発見＝利用者向け署名トークンリンクのHost依存）。詳細は `../../tpr-001/balthasar.md`、是正の要約は snapshot 同梱の `TPR-001_REMEDIATION.md`。

## 2. 各人格の観点（同じ是正を別レンズで）
### BALTHASAR-2（技術）
- B-001〜B-017 が**実コードで閉塞**したか、**回帰が無いか**を再検証（特に決済Webhookの状態機械・冪等性・楽観ロック、管理リセット/トークンリンクのHost非依存、削除フローのrequest/confirm、CSP/外部JS化）。
- 完了フェーズの追加分（販売記録の楽観ロック・日次照合cron・一覧SSR・checkout fail-open是正）の妥当性と副作用。
- 残存リスク（整合性/可用性）が本番運用に許容できるか。`node --check` 等で実証。

### MELCHIOR-1（仕様）
- **網羅性**：tpr-001の各指摘とBALTHASAR推奨が漏れなく対応されたか（実装済/部分実装/提案のみ/Sota判断の分類が妥当か）。
- 受入基準・元レポートの推奨に**逸脱や過不足**がないか。「提案のみ」に留めた項目（Turnstile・DNS・保持値）が、コードで対応すべきものを取りこぼしていないか。
- 変更ファイル一覧（evidence/diffstat）と実差分の一致。

### CASPER-3（経営・思想）
- 是正が**運用契約**（`master-agreement.md`）を守ったか：重大変更プロセス（デプロイをSota承認ゲートに留置）・情報保護（外部AIへ実Secret/PII非共有）・単一書き手・スコープ逸脱の有無。
- **KIBI憲章/世界観**（`charter-public.md`）：是正がブランドの静かなトーン・UX（退会導線・Cookie同意・SEO/多言語方針）を損ねていないか。
- Sotaへ上げるべき経営・ポリシー論点（保持期間×Privacy Policy整合、Analytics/SEOのブランド影響、DNS/メール送信構成）。

## 3. 提供物（このinbox内・格納済み｜round-2・commit 40d68cb）
- `snapshot/`（71ファイル）… 是正後ソース。**今回 `assets/js/`（main.js・analytics.js・utils.js・confirm.js・unsubscribe.js）を同梱**＝round-1差し戻しの根因を解消。functions/edge/netlify.toml/HTML/package＋`privacy-content.md`（privacy/legal/terms 公開本文＝CASPER C-002整合判定用・鍵非含有）＋ `TPR-001_REMEDIATION.md`・`TPR-001_ADMIN_ACTIONS.md`。
- `evidence/` … `diff-stat.txt`／**`diff-assets.patch`（assets/js 差分＝新規）**／`diff-functions.patch`／`node-check.txt`（全functions/edge OK・社長室再実行）。
- `ENV-VARS-INVENTORY.md` … 環境変数名のみ。
- round-1からの追加是正：T2-002（api-orders 在庫/CAS整合単位化）・T2-003（payment_intent.canceled 実装・dispute通知）・T2-004（非本番fail-closed）・M-003（文書整合）。**特に B-004/B-009/B-010/B-011 のクライアント実体を assets/js で独立検証可能**。
- 参照：tpr-001 `../../tpr-001/balthasar.md`・round-1 `../verdict.md`。


## 4. 出力（各 `tpr-002/<persona>.md` ＋ `verdict.md`｜forms.md §11準拠）
- 各人格：判定（`APPROVE / APPROVE_WITH_CONDITIONS / RETURN_TO_CODEX / RETURN_TO_CLAUDE / ESCALATE_TO_HUMAN / REJECT`）＋所見＋勧告。
- `verdict.md`（合議）：3票集計（**2/3で成立**、`ESCALATE_TO_HUMAN`は1票で成立）。本番デプロイ可否の結論＋条件＋Sotaへ上げる論点。
- **起動運用**：SotaがChatGPTでBALTHASAR・MELCHIORを別チャットで独立起動、Claude別セッションでCASPERを起動し、本書＋inboxを与える。出力は各 `tpr-002/<persona>.md` に保存（社長室代行可・内容改変禁止）。

## 5. 禁止
本番データ変更・実決済・大量リクエスト・snapshot外アクセス・Secret値記載・実装/修正（勧告のみ）。
