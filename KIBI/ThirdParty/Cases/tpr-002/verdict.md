# 合議判定 verdict — tpr-002

> **Round-2（最新・有効）を上段**、Round-1記録を下段に保持（契約 第17条＝証跡改変禁止）。

---

## ★ 合議判定 Round-2（2026-06-13・最新・有効）

- 集約者: **CASPER-3（KIBI-MAGI）** ※Sota決定（2026-06-13）により、verdict集約はCASPERが直接担当（[casper-advisory-contract.md](casper-advisory-contract.md)）。**各人格の判定は改変していない**（票の転記＋条件の統合のみ）。
- 対象: tpr-001是正後 `kibi-fragrance.jp`（branch `security/tpr-001`・commit **40d68cb**・本番未反映）

### 1. 3人格のRound-2判定
| 人格 | 観点 | Round-2判定 |
|---|---|---|
| BALTHASAR-2 | 技術 | **APPROVE_WITH_CONDITIONS** |
| MELCHIOR-1 | 仕様 | **APPROVE_WITH_CONDITIONS** |
| CASPER-3 | 経営・思想 | **APPROVE_WITH_CONDITIONS**（＋ESCALATE_TO_HUMAN: C-002/C-003） |

### 2. 合議結果（契約 第9条：2/3成立・ESCALATE_TO_HUMANは1票成立）
- **結論＝APPROVE_WITH_CONDITIONS 成立（3/3）。** round-1差し戻し根因（`assets/js`供給不足）は解消し、3人格ともフロント実体を独立検証して承認系に転じた。
- **ESCALATE_TO_HUMAN 成立**（CASPER 1票）＝C-002・C-003をSotaへ。
- **本番デプロイは「下記条件を満たし、Sota承認を得てから」**。条件未充足のまま `netlify deploy --prod` へ進まない（重大変更＝第14条）。

### 3. クロスモデル検証の補足（CASPER／Claude）
- round-1技術残件 **T2-002（整合単位化）・T2-003（canceled/dispute）・T2-004（非本番fail-closed）・M-003（文書整合）** をClaude独立検証でも「コード上CLOSED」と確認（[casper-crosscheck-round2.md](casper-crosscheck-round2.md)）。
- CASPERが当初挙げたX-1（delete確認URL未統一）は**round-1読みに基づく誤りとして撤回**。round-2は `getCanonicalBaseUrl()` 経由でfail-closed＝BALTHASARのT2-004 CLOSEDが正。

### 4. 統合条件（本番デプロイ前｜3人格の条件を重複排除して統合）

**G1. コード是正（デプロイ前に閉じる）**
- **B-009 旧localStorage**：同意フラグ無しの旧 `kibi_shipping_<uid>` は読込/checkout時に使わず削除・無視。checkoutも同意フラグ必須に（BALTHASAR条件1）。
- **T2-R2-002 api-orders**：`updateData()` の戻り値（CONFLICT等）を検査し、失敗を成功扱いしない＝販売記録だけ動いて在庫未反映の逆乖離を防ぐ（BALTHASAR条件2）。
- **T2-R2-004 Checkout戻りURL**：`success_url`/`cancel_url` のoriginをリクエスト由来でなく正規origin/allowlistから生成（BALTHASAR条件4）。

**G2. Sota/Legal判断（ESCALATE・一部はデプロイ前必須）**
- **C-002（デプロイ前必須・Legal）**：公開Privacy Policy本文を実装へ整合（削除権・保持境界・端末保存・バックアップ内PII失効・オンサイトCookie同意）。退会フローを公開しながら説明が無い状態にしない（CASPER C-002／MELCHIOR条件A／BALTHASAR条件6）。
- **保持範囲**：`DELETE_RETAIN_SHIPPING_FIELDS` を空（全匿名化）で行くか会計保持するかを確定（全人格）。
- **C-003（デプロイと独立）**：fail-open（B-005／T2-001／T2-R2-003 仮押さえストア障害時）を初期リスクとして許容するか／Turnstile（B-008）／多言語SEO（B-011）／DNS・メール構成（B-014）の方針決定。許容時もSlack/日次照合で重大アラート化（CASPER C-003／BALTHASAR条件3／MELCHIOR条件B）。

**G3. 運用証跡・実機確認（Sota承認ゲート前｜値でなく設定状態）**
- Stripe Dashboardで実装済み**6イベント購読**（completed/expired/charge.refunded/payment_intent.payment_failed/payment_intent.canceled/async_payment_failed）。disputeは購読する場合の人手確認責任者・手順を確定。
- 本番env設定状態の確認：`URL`・`DELETION_HMAC_SECRET`（B-001/004/017前提）・`ALLOW_TOKEN_AUTH`・`CHECKOUT_RATELIMIT_FAILOPEN`。
- 管理画面：Stripe/Netlify/Firebase/Gmail/DNSの権限者・MFA・退職者/外注者棚卸し・バックアップ復元訓練。
- ステージング実機：B-004（削除フローの順序＝サーバ削除成功後にのみFirebase削除）・B-010（同意前/拒否後/同意後のGA発火3状態）・B-011（初期HTML/JSON-LD二重注入）。

**G4. 文書・パッケージ整合（軽微）**
- `ENV-VARS-INVENTORY.md` の `CHECKOUT_RL_*`/`CHECKOUT_RESERVE_*` を運用ノブとして整理（MELCHIOR条件E）。
- `TPR-001_REMEDIATION.md` の古記述（B-007購読3件・B-005 fail-open表現）をround-2状態へ更新。
- `snapshot` から `.DS_Store` 除外（BALTHASAR/MELCHIOR）。
- `Contracts/README.md` の master-agreement版表記（v0.1→**v0.2**）・`ThirdParty/README.md` の読取対象パス（旧 `External/Orders/` → `External/Codex/Orders/`）の整合（BALTHASAR指摘・契約v0.2反映漏れ）。

**G5. ガバナンス**
- **段階デプロイ**とし、残CASライター（survey/shipping-notify/delete-account）のCAS統一を次フォローとして起票・追跡（CASPER C-004）。

### 5. Sotaへ上げる論点（ESCALATE_TO_HUMAN）
- **C-002**（Legal・デプロイ前必須）：公開Privacy Policyを実装へ整合。
- **C-003**：fail-open許容可否／Turnstile／多言語SEO／DNS・メール構成。
- **保持範囲**：`DELETE_RETAIN_SHIPPING_FIELDS` の確定。
- **運用証跡の粒度**：値でなく「設定状態・画面名・確認者・日時」で残す方針の承認。
- **（関連・tpr-002枠外）契約整備**：別紙A↔README§4の不整合とverdict集約役割の明文化（[casper-advisory-contract.md](casper-advisory-contract.md)）。社長室起案→MAGI審査→Sota承認で。

### 6. 次アクション
1. **G1のコード是正**（情シス）→ B-009旧値・api-orders戻り値検査・Checkout戻りURL。
2. **G2/G3をSota承認ゲートで明示**（C-002はデプロイ前にLegal確定）。
3. G1反映後、軽微なら差分のみの最終確認で足りる（再round不要の見込み。重大な追加変更があれば再審査）。
4. 全条件充足＋Sota承認 → `netlify deploy --prod`（段階デプロイ）。

---
---

## 合議判定 Round-1（保持・改変禁止｜社長室で集約）

- 集約日: 2026-06-13 ｜ 集約者: 社長室（Claude）※合議は社長室で実施（Sota指示）
- 対象: tpr-001是正後 `kibi-fragrance.jp`（branch security/tpr-001・commit 003ee82・本番未反映）

## 1. 3人格の判定
| 人格 | 観点 | 判定 |
|---|---|---|
| BALTHASAR-2 | 技術 | **RETURN_TO_CODEX** |
| MELCHIOR-1 | 仕様 | **RETURN_TO_CLAUDE** |
| CASPER-3 | 経営・思想 | **APPROVE_WITH_CONDITIONS**（＋ESCALATE_TO_HUMAN: C-002/C-003） |

## 2. 合議結果（契約 第9条：2/3成立・ESCALATE_TO_HUMANは1票成立）
- **結論＝RETURN（本番デプロイ不可）。** 2/3（BALTHASAR・MELCHIOR）が「資料不足で再審査が必要」として差し戻し。CASPERの条件付き承認は単独で重大変更を確定しない（同門・2/3要件）。
- **ESCALATE_TO_HUMAN 成立**（CASPER 1票）＝C-002・C-003をSotaへ上げる。
- **デプロイは保留継続**（Sota承認ゲートの手前）。

## 3. 差し戻しの根因（社長室の手落ち）
- tpr-002 snapshot に **`assets/js/main.js`・`assets/js/analytics.js`（＋privacy本文）が未同梱**。`diff-functions.patch` も functions/edge/toml のみ。
- 結果、**B-004（退会UIクライアント）・B-009（localStorage PII）・B-010（GA/GTM外部JS化）・B-011（main.js二重注入抑止）が独立検証不能＝UNVERIFIED**。
- `SHARING-LOG`/`request.md` は「66ファイル」と記載も実体65（.DS_Store削除後の不整合・MELCHIOR M-001）。
- → これは情報保護のマスキングではなく**供給不足**。社長室が再供給する。

## 4. 確認できた範囲の技術判定（参考・round-1）
- **CLOSED**: B-001（管理リセットHost非依存・共有ヘルパ）/ B-006（requireAdmin統一）/ B-013（no-store）/ B-016（font preload）。
- **MOSTLY_CLOSED**: B-002（状態機械・失敗時500。在庫二重減算の狭い窓残）/ B-003（PII匿名化・保持はLegal条件）/ B-015（.html統一）/ B-017（Host非依存。ただしURL未設定フォールバック）。
- **PARTIAL**: B-005（fail-closed既定だが仮押さえ集計/保存失敗時続行）/ B-007（refund/failed/async実装。canceled・dispute未対応）/ B-008（fail-closed・上限。Turnstile提案のみ）/ B-011（SSR側CLOSED・main.js側未検証）/ B-012（運用課題）。
- **UNVERIFIED**（フロントJS不在）: B-004 / B-009 / B-010 / B-011クライアント。

## 5. 新規・残存の技術所見（round-1で検出＝要是正）
- **T2-002（要修正・私の前ターン起因）**: `api-orders.js` で在庫を先に更新→販売記録CAS。CAS失敗(409/404)時に在庫だけ動き**販売記録と在庫が乖離**。→ 整合単位化（販売記録CAS成功後に在庫、or 失敗時補償）。
- **T2-003**: B-007対象イベントの文書/コード齟齬＝`payment_intent.canceled` 未処理、`charge.dispute.created`（ADMIN_ACTIONS記載）コード未対応。→ イベント集合を確定しコード・文書・Stripe設定を一致。
- **T2-001（B-005残）**: checkout 仮押さえ集計/保存失敗時に決済続行＝オーバーセル余地。→ 集計失敗は503 fail-closed、保存失敗は補償/重大アラート。
- **T2-004（B-017残）**: `URL` 未設定時に本番ドメインへフォールバック＝Preview/検証で誤送信先。→ 非本番はfail-closed（B-001と方針統一）。
- **M-003（文書）**: `TPR-001_ADMIN_ACTIONS.md` に旧「fail-open」記述が残存＝現コード(fail-closed)と齟齬。→ 文書を現コードへ更新。
- **C-004（経営）**: 是正が16指摘＋B-017を超え新規コード多数（reconcile-cron/list-ssr/共有CAS/api-orders改修）。残CASライター（survey/shipping-notify/delete-account）未統一。→ 段階デプロイ＋次フォロー起票。

## 6. ESCALATE_TO_HUMAN（Sota/Legal 判断・デプロイと独立）
- **C-002**: 退会・PII保持ポリシー（`DELETE_RETAIN_SHIPPING_FIELDS` の値）をLegal/Sotaが確定し、Privacy Policy本文・「削除しました」文言・バックアップ内PII失効と**一括整合**（デプロイ前必須）。
- **C-003**: fail-open（B-005）/ Turnstile（B-008）/ 多言語SEO（B-011）/ DNS・メール構成（B-014）の方針決定（DNSはSota権限）。

## 7. 次アクション（社長室）
1. **情シスへフィードバック→是正**：T2-002（最優先・整合単位化）・T2-003（イベント整合）・T2-004（非本番fail-closed）・M-003（文書整合）。サブエージェントで並列是正→検証。
2. **再供給**：是正反映後、`assets/js/main.js`・`analytics.js`（＋privacy本文）・`diff-assets.patch` を snapshot/evidence へ追加し、件数・記載を再照合。
3. **tpr-002 round-2 再審査**：再供給後、3人格へ再投入（特にB-004/009/010/011とT2系の再確認）。
4. **Sotaへ**：C-002/C-003 を提示・判断要請（デプロイと独立に進行可）。
5. round-2でAPPROVE(_WITH_CONDITIONS)→Sota承認→`netlify deploy --prod`。

---

# 付録：WP-M-003 独立検証（テスト・QA担当・敵対的レビュー 2026-06-13）

対象: `Internal/System/docs/TPR-001_ADMIN_ACTIONS.md`（文書のみ変更）。観点=review（妥当性・回帰）。
総合: **PARTIAL**（M-003-2 / M-003-3 妥当、M-003-1 に文書とコードの事実齟齬・運用誤誘導）。

## node_check
- 申告どおり `node --check` 3ファイル（stripe-webhook / api-contact / create-checkout）合格を再現。
- ただし本WPは文書変更でありコード構文は文書整合を保証しない。実コードと照合した。

## M-003-1（Webhook イベント集合）── 不整合
- 実コードは **7イベント処理**（grep `stripeEvent.type ===`）: completed(76)/expired(406)/charge.refunded(419)/
  payment_intent.payment_failed(455)/**payment_intent.canceled(483-508)**/async_payment_failed(512)/charge.dispute.created(549)。
- 文書は `payment_intent.canceled` を「未実装イベント（現在のコードでは処理なし）」「購読設定不要」と記載（doc 213-216）。
  だが実コード 483-508 にハンドラ実在（`patchSalesRecords`→`payment_status='canceled'`・`canceled_at`、競合時500再試行。
  コメント「tpr-001で挙げたキャンセル系」「T2-003」=既実装）。
- **これは round-1 の T2-003 が「コード未対応」と指摘した箇所が、その後コードで是正されたのに、WP-M-003 の文書編集が
  逆に「未実装」と後退記述した齟齬。** 文書はSotaにStripe購読不要と誤誘導し、実装済みのキャンセル処理を運用で無効化させる
  会計整合の穴を生む（回帰リスク）。実装済み5件・dispute(log/notify only) の記述自体は正確。

## M-003-2（B-008 fail-open→fail-closed）── 妥当
- api-contact: IP 1h/3回(59)＋グローバル日次 **300**(`GLOBAL_SEND_MAX=300` line13)＋障害時503 fail-closed(79-83/116-119)。文書一致。
- newsletter / subscribe(再入荷) / member-verify も fail-closed 確認。文書「同様に」は妥当。
- 軽微注記（判定不変）: 他3APIのグローバル上限は500（contactは300）。newsletterのグローバル上限はsubscribe行為のみ対象。
  文書は他APIの数値を断定せず§3.6で保留＝虚偽の数値主張なし。

## M-003-3（B-005 fail-closed 既定）── 妥当
- create-checkout line43 `RATELIMIT_FAILOPEN = ...=== 'true'`。未設定時 false → 既定 fail-closed(503)。evaluateRateLimit(73-88)で確証。
- 仮押さえ上限(36-37/219-222)・TTL(16-17)実装済み。T2-001（集計失敗 line188「続行」/保存失敗 316-319「続行」）は実際に残存、
  文書「要対応」注記は正確（過大申告なし）。

## 回帰確認
- 文書のみの変更でコード差分なし。既存正常系（署名検証・サーバ価格正本・CAS・fail-closed群）への影響なし。
- 唯一の回帰リスク=M-003-1 の運用誤誘導（文書がコードより後退、Sota指示を誤らせる）。

## 是正勧告（勧告のみ）
1. doc 2.1.3 の `payment_intent.canceled` を「未実装」→「実装済み（コード483-508）」へ訂正し、Stripe Dashboard 購読対象へ移す
   （実装済み6件＋dispute=計7、または canceled を実装済み群へ移し購読必須化）。round-1 T2-003 の意図と一致させる。
2. 任意: 他メールAPIのグローバル日次上限 contact=300 / 他=500 の差を §2.4 or §3.6 に明示。
