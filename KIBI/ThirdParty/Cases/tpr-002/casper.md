# CASPER-3 審査 tpr-002（経営・思想観点）

> 本ファイルはtpr-002のCASPER記録。**Round-2（最新・有効）を上段**、Round-1記録を下段に保持（契約 第17条＝証跡改変禁止）。

---

## ★ Round-2 判定（2026-06-13・最新・有効）

- 判定: **APPROVE_WITH_CONDITIONS**（＋ ESCALATE_TO_HUMAN: C-002・C-003）
- 対象: tpr-001是正後 `kibi-fragrance.jp`（branch `security/tpr-001`・commit **40d68cb**・本番未反映）
- 経緯: round-1は assets/js 欠落で合議RETURN。本round-2で **フロントJS5本＋`privacy-content.md`＋`diff-assets.patch`** を再供給。**C-001（供給不足）は解消**。
- 観点: 運用契約（v0.2）遵守／KIBI憲章・世界観／Sotaへ上げる経営・ポリシー論点
- 同門開示: CASPER-3はClaude系＝社長室と同門（第10条5項）。本判定単独で重大変更は確定しない（2/3要件・ESCALATE_TO_HUMANは1票成立）。自己申告（REMEDIATION/request）は鵜呑みにせず、`diff-assets.patch`・`privacy-content.md`・各ソースで独立照合した。

### 所見

**契約遵守（v0.2確認込み）**
- 契約はv0.2（dec-020・External多重委託化）へ改訂されたが、**第14条（重大変更）・第16条（情報保護）・別紙AのThirdParty権限・MAGI審査プロセスは不変**。改訂の主眼は `External/Codex/` 化と委託先多様化（別紙C）で、本審査（対象＝Internal/System の kibi-fragrance.jp、外注ではない）への影響はない。
- **デプロイゲート維持**（第14条・REMEDIATION §5）／**内製・外注境界の遵守**（決済/認証/本番デプロイはSystem外注不可＝別紙B。情シス内製）／**情報保護維持**（再供給分もSecret実値0・名称のみ・`data.json`除外、`privacy-content.md`は公開法務本文で鍵非含有＝SHARING-LOG §6で再走査記録）。round-2の供給拡大は第16条の範囲内。

**C-001（供給不足）── 解消・検証完了**
- round-1でUNVERIFIEDだったフロント実体を `diff-assets.patch` で独立確認。いずれも健全かつブランド/プライバシー整合：
  - **B-004 退会フロー**: `request`（IDトークン）→確認メール→`confirm`→**サーバ削除成功後にのみ**ローカル/Firebase削除。トークンを履歴から除去。「削除した気にさせる」silent失敗を解消。UX文言も正直（`delete_request_sent` 等）。
  - **B-009 配送先PII**: 明示チェック同意時のみ端末保存・未同意で既存削除・ログアウトで削除（`clearShippingForCurrentUser`）。4言語。
  - **B-010 GA/GTM**: 同意(accepted)後にのみ検証済IDを外部 `analytics.js` へ渡して読込。inline廃止でCSP適合・同意前非発火維持。
  - **B-011/B-015**: Edge SSRのJSON-LD存在時はクライアント注入skip（二重注入防止）／canonical・hreflangを`.html`正規形に統一。
- 評価: MAGIのクロスチェックが「供給不足」を本番前に検出し、再供給で閉じた好例（ガバナンス上の正の信号）。

**C-002（退会・PII × 公開Privacy Policy整合）── 維持・ESCALATE_TO_HUMAN（今回具体化）**
- `privacy-content.md` を確認。公開Privacy Policy本文には **退会・削除権／削除時の保持境界（`DELETE_RETAIN_SHIPPING_FIELDS`）／端末への配送先保存（B-009）／バックアップ内PII失効（B-012）／オンサイトCookie同意（`kibi_cookie_consent`）** のいずれも記載がない。Cookie節は「ブラウザ設定で無効化」のみ言及し、実装のオンサイト同意UIを説明していない。
- 評価: **実装が公開ポリシーより前進**しており、削除フローが本番公開されるのにポリシーがそれを説明しない＝対顧客の約束が実態に追随していない（ブランド信頼・法的説明責任のリスク）。コード既定（全匿名化）ゆえ現状の「削除しました」表示自体は虚偽ではないが、**Legal/Sotaがデプロイ前に本文を実装へ整合**させること。
- 参考（憲章§2-5）: `legal_notice`（特商法）の運営統括責任者名・住所・電話は**特商法の法定記載**＝「個人名・私生活を過度に露出しない」の正当な例外。是正不要。

**C-003（経営判断ゲート）── 維持・ESCALATE_TO_HUMAN**
- fail-open（B-005）／Turnstile（B-008）／多言語SEO方針（B-011）／DNS・メール構成（B-014）はround-2でも未決＝技術でなく**経営・ブランド戦略の判断**。needs_sotaとして正しく留置されている。本番デプロイと独立にSotaが方針決定（DNSはSota権限）。

**C-004（変更管理／スコープ）── 維持**
- 是正面はround-2でさらに拡大（T2-002 整合単位化／T2-003 canceled+dispute／T2-004 非本番fail-closed）。筋は通るが「16指摘の修正」を超える重大変更面。残CASライター（survey/shipping-notify/delete-account）統一は未了。
- 評価: 技術的閉塞の主査はBALTHASAR、網羅性はMELCHIOR。CASPERは**段階デプロイ**と残フォローの起票・追跡を再勧告。

### 勧告（本番デプロイ前の条件）
1. **[ESCALATE_TO_HUMAN｜C-002]** Legal/Sota が公開Privacy Policy本文を実装へ整合改訂（削除権・保持境界・端末保存・バックアップPII失効・オンサイトCookie同意）。退会フローを公開しながら説明が無い状態でデプロイしない。
2. **[ESCALATE_TO_HUMAN｜C-003]** fail-open（B-005）・Turnstile（B-008）・多言語SEO（B-011）・DNS/メール構成（B-014）の方針決定（デプロイと独立）。
3. **[C-004]** 段階デプロイとし、残CASライター統一を次フォローとして起票・追跡。
4. デプロイ時に本番 `URL`（正規ドメイン）・`DELETION_HMAC_SECRET` の設定確認（B-001/B-004/B-017の前提）。

### Sotaへ上げる論点
- **あり**:
  - **C-002**（Legal必須・デプロイ前）：公開Privacy Policyを実装に整合。
  - **C-003**：fail-open／Turnstile／多言語SEO／DNS・メール構成の方針決定。
  - 参考：C-001は解消済（再供給で独立検証完了）。C-004は段階デプロイ可否の認識共有。

> 経営・思想観点ではround-2でデプロイ阻害要因は解消方向。残る条件はLegal/Sotaの**人間判断（C-002/C-003）**であり、コード起因ではない。技術閉塞（T2系）・仕様網羅の最終確認はBALTHASAR-2・MELCHIOR-1のround-2判定に委ねる。合議成立は3人格round-2が揃った時点。

---
---

## Round-1 記録（保持・改変禁止｜2026-06-13）

- 判定: **APPROVE_WITH_CONDITIONS**（＋ ESCALATE_TO_HUMAN 論点あり＝C-002・C-003）
- 対象: tpr-001是正後 `kibi-fragrance.jp`（branch `security/tpr-001`・本番未反映）
- 観点: 運用契約遵守（重大変更プロセス・情報保護・単一書き手・スコープ）／KIBI憲章・世界観／Sotaへ上げる経営・ポリシー論点
- 同門開示: CASPER-3はClaude系＝社長室と同門（第10条5項）。本判定単独で重大変更は確定しない（2/3要件）。

### 所見

#### 良い点（経営・ガバナンス）
- **デプロイゲート維持（第14条）**: 重大変更につき本番反映をSota承認＋ステージング＋本審査の後に留置。
- **内製・外注境界の遵守（別紙B）**: 決済/認証/本番デプロイは外注不可。情シス内製で境界判断は妥当。
- **情報保護の維持（第16条）**: Secret実値0・ENV名称のみ・`data.json`除外・DNS草案はプレースホルダ。外部AIへのTier0露出なし。
- **退会サーバーフローの設計は堅牢**: request＝IDトークン＋検証済メール＋emailVerified、confirm＝HMAC、admin＝requireAdmin。既定で販売記録PIIを全匿名化。
- **世界観・トーン非毀損（憲章§2-§4）**: ブランド文言・命名・世界観に手を入れていない。

#### 懸念・要対応
- **C-001（審査完全性／情報供給の不足）── 重要**: 差分に `assets/js/main.js`(+266)・新規 `analytics.js`(+47) があるのにsnapshotに `assets/` 不在・patchにも未収録。`privacy.html` 本文もJS描画で不在。→ B-004クライアント・B-009・B-010・B-011クライアント・Privacy整合が独立検証不能＝「未確認」。第16条のマスキングではなく供給不足。
- **C-002（退会・PII × Privacy整合）── ESCALATE**: 保持ポリシー未確定。Legal/Sotaが保持を選ぶとUI文言・Privacy本文・バックアップ失効が不整合化。デプロイ前にLegal確定必須。
- **C-003（経営判断ゲート）── ESCALATE**: fail-open/Turnstile/多言語SEO/DNS は人間判断。デプロイと独立にSota方針決定。
- **C-004（変更管理／スコープ拡大）**: 是正が16指摘＋B-017を超え新規コード多数。残CASライター未統一。段階デプロイを勧告。

#### 勧告（round-1）
1. [ESCALATE] Legal/Sota が退会・PII保持ポリシーを確定し、Privacy本文・文言・バックアップ失効と一括整合（C-002）。
2. 未同梱ソース（main.js・analytics.js・Privacy本文）を追加供給して再確認、またはステージング留置（C-001）。
3. [ESCALATE] fail-open・Turnstile・多言語SEO・DNS/メールの方針決定（C-003）。
4. 段階デプロイ・残CASライター統一を次フォロー起票（C-004）。
5. デプロイ時 本番 `URL`・`DELETION_HMAC_SECRET` 設定確認。

#### Sotaへ上げる論点（round-1）
- あり: 退会・PII保持ポリシー確定（C-002）／fail-open・Turnstile・多言語SEO・DNS方針（C-003）／未供給フロントJS・Privacy本文の扱い（C-001）／スコープ拡大の認識共有（C-004）。

---
*CASPER-3｜KIBI-MAGI（中立審査）｜2026-06-13 JST｜編集・実装・承認権なし＝勧告のみ*
