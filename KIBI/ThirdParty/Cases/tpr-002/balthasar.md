# BALTHASAR-2 審査 tpr-002

> 本ファイルはtpr-002のBALTHASAR記録。**Round-2（最新・有効）を上段**、Round-1記録を下段に保持する。

---

## ★ Round-2 判定（2026-06-13・最新・有効）

- 判定: **APPROVE_WITH_CONDITIONS**
- 対象: tpr-001是正後 snapshot round-2（branch `security/tpr-001`、commit `40d68cb` と申告）
- 観点: 技術再審査。tpr-001 B-001〜B-017、round-1 T2-001〜T2-004、フロントJS実体、契約v0.2反映。
- 結論: round-1の差し戻し根因（`assets/js` 不足）は解消。B-004/B-010/B-011/T2-003/T2-004はコード上おおむね閉塞した。一方、B-009の旧localStorage移行、`api-orders` の在庫更新結果未確認、checkout仮押さえfail-open、実管理画面設定の未確認は本番前条件として残る。条件を閉じる前の無条件デプロイは不可。
- 注意: 本審査は供給snapshot/evidenceの静的確認であり、Stripe/Netlify/Firebase/Gmail/GA実画面、MFA、バックアップ復元、本番Network発火は未確認。

### 0. 契約更新の確認

- `Contracts/master-agreement.md` は v0.2（2026-06-13 / dec-020）へ更新済み。主変更は External 多重委託化、`External/Codex/Orders/<ord>/` へのパス整理、委託先台帳/ルーティング/浅い二次受け規程の追加。
- ThirdParty/MAGIの権限は本件では実質不変。`Internal/`・本番Secret・顧客データへ接触せず、`Cases/tpr-002/` に勧告のみを書く運用を継続。
- 軽微な文書整合: `Contracts/README.md` の `master-agreement.md` 現行版が v0.1 表記のまま、`ThirdParty/README.md` の読取対象が旧 `External/Orders/ord-NNN/` のまま。正本は `master-agreement.md` v0.2 として扱う。今回の本番可否を止めるものではないが、契約文書整備として修正推奨。

### 1. BALTHASAR側の再検証

- `snapshot/` は71ファイル。round-2依頼どおり `assets/js/main.js`、`analytics.js`、`utils.js`、`confirm.js`、`unsubscribe.js` を確認。
- 供給された全 `.js` に対し `node --check` を再実行し、構文エラーなし。
- snapshot/evidence/ENV目録に対し、Stripe鍵・Firebase秘密鍵・GitHub token・AWS鍵・private key等の代表的パターンを検索し、実Secret値らしきものは検出なし。
- `snapshot/netlify/functions/.DS_Store` が混入。機密ではないが、共有snapshotからは除外すること。

### 2. round-1ブロッカー

**T2-BL-001: フロントJS資産不足**
- 判定: **CLOSED**
- 根拠: `request.md` がround-2でフロントJS5本と `diff-assets.patch` の再供給を明記。実体も `snapshot/assets/js/` に存在。
- 影響: round-1でUNVERIFIEDだった B-004/B-009/B-010/B-011 のクライアント側を独立検証可能になった。

### 3. 閉塞を確認した主項目

| ID | round-2技術判定 | 根拠 |
|---|---|---|
| B-004 退会UI未接続 | **CLOSED** | `main.js` は `?delete_token` 着地を最優先処理し、履歴からtokenを除去後、`/api/delete-account` の `confirm` 成功後にローカル/Firebase削除へ進む。申請側はFirebase IDトークン付き `request`。`api-delete-account.js` はHMAC token、emailVerified、販売記録PII匿名化を備える。 |
| B-010 Cookie同意後Analytics | **CLOSED_CODE / RUNTIME_CONDITION** | 同意値が `accepted` の時だけ `injectAnalytics()` が `/assets/js/analytics.js` を読み込む。拒否時は読み込まない。外部JS化によりCSPのinline禁止とも整合。実Network/GA DebugViewの3状態確認は本番前条件。 |
| B-011 JS描画SEO/AI可読性 | **MOSTLY_CLOSED** | `ogp-rewrite.js` が商品/記事、`list-ssr.js` がトップ/collection/newsの初期本文とJSON-LDをEdge側で注入。`main.js` はSSR JSON-LD検出時に重複注入を抑止。AIスキャニングで不利になり得た「初期HTMLが薄い」問題は大きく改善。多言語SEOと本番Search Console/Rich Results確認は別条件。 |
| T2-003 Stripeイベント整合 | **CLOSED_WITH_OPERATIONS_CONDITION** | `payment_intent.canceled` は `stripe-webhook.js` に実装済み。`charge.dispute.created` は自動確定せず、ログ/通知/販売記録フラグで人手確認へ回す設計。Stripe Dashboardで実装済み6イベント購読が条件。 |
| T2-004 非本番URL fail-closed | **CLOSED** | 会員確認/Newsletter/再入荷/削除確認リンクは `security.getCanonicalBaseUrl()` 経由になり、非本番で `URL` 未設定なら送信停止/失敗に倒す。 |

### 4. 残存条件・技術所見

#### T2-R2-001: B-009 旧localStorage配送先の移行が不十分
- 重要度: Medium（Privacy/UX）
- 対象: `assets/js/main.js:1781-1798`, `3006-3011`, `3197-3228`
- 内容: 新規保存は同意チェックボックスに依存し、未同意保存時は削除される。一方、既存ユーザー端末に `kibi_shipping_<uid>` が残っていて `kibi_shipping_consent_<uid>` が無い場合でも、My Pageは値を読み込み、checkoutは同意フラグを見ずに配送先をStripeへ渡す。
- 影響: round-2後の新規保存方針は改善したが、旧保存値の明示同意なし利用が残る。
- 条件: 読込時/checkout時に `kibi_shipping_consent_<uid> === '1'` の場合だけ保存配送先を使う。フラグが無い旧値は起動時に削除または無視する。退会完了時は `kibi_shipping_consent_<uid>` も削除する。

#### T2-R2-002: `api-orders` は在庫更新結果を確認していない
- 重要度: Medium（管理操作の整合性）
- 対象: `netlify/functions/api-orders.js:120-128`, `158-166`, `223-234`; `_shared/site-data.js:21-42`
- 内容: round-1で指摘した「在庫だけ先に動く」問題は、販売記録CAS成功後に在庫を動かす順へ改善された。ただし `updateData()` は競合時に `{ ok:false, code:'CONFLICT' }` を返す設計であり、`api-orders.js` は戻り値を見ずに200を返す。
- 影響: 逆方向、つまり販売記録は変更されたが在庫が反映されない不整合が残る。
- 条件: `updateData()` の戻り値を検査し、失敗時は409/503、管理通知、照合アラート、または補償処理へ回す。少なくとも成功ログとして扱わない。

#### T2-R2-003: Checkout仮押さえストア障害時はまだfail-open
- 重要度: Medium（在庫/可用性/Sota判断）
- 対象: `netlify/functions/create-checkout.js:174-188`, `307-319`
- 内容: レート制限は既定fail-closedへ改善済み。一方、仮押さえ集計失敗時は「仮押さえなし」として続行し、仮押さえ保存失敗時もCheckout Sessionを返す。
- 影響: 在庫ブロック対策の実効性低下、オーバーセル、表示在庫と実売の乖離。
- 条件: 本番前にSotaが「段階対応として許容」か「集計/保存失敗時もfail-closedまたは補償処理」を明示する。許容する場合もSlack/日次照合で重大アラート化する。

#### T2-R2-004: Stripe成功/キャンセルURLのoriginがリクエスト由来
- 重要度: Medium-Low
- 対象: `netlify/functions/create-checkout.js:257-271`
- 内容: `success_url` / `cancel_url` のoriginが `event.headers.origin` または `referer` から作られる。メールトークン系のB-017とは別経路だが、決済後の戻り先として攻撃者由来originを混入させる余地がある。
- 条件: `security.getCanonicalBaseUrl()` または許可originリストから生成する。少なくとも本番は `https://kibi-fragrance.jp` 固定を推奨。

#### T2-R2-005: 管理画面/外部サービス設定は未確認
- 重要度: High（運用前提）
- 未確認: Stripe DashboardのWebhook購読、Netlify env値、Firebase Auth/MFA、Gmail送信アカウント/MFA、管理者アカウント棚卸し、バックアップ復元訓練、GA/GTM実発火。
- 条件: 値をThirdPartyへ渡す必要はない。管理画面で「設定済み/未設定/証跡スクリーンショットまたは実行ログ」を社長室が確認し、Sota承認前チェックとして残すこと。

#### T2-R2-006: Privacy/保持/バックアップ文言の整合
- 重要度: Medium（Legal/Sota）
- 内容: 削除フローと `DELETE_RETAIN_SHIPPING_FIELDS` はコード側で可変。バックアップ内PIIの失効・復元時の再削除、端末保存、Cookie同意UIの説明は公開Privacy Policyと運用手順に反映が必要。
- 条件: Legal/Sotaが保持方針を決め、Privacy Policy・削除完了文言・バックアップ復元手順を一致させる。

### 5. 指摘別まとめ

| ID | BALTHASAR round-2判定 |
|---|---|
| B-001 | CLOSED。管理系Host依存は共有ヘルパ化。本番 `URL` 設定が前提。 |
| B-002 | MOSTLY_CLOSED。Webhook状態機械/非2xx再試行は改善。管理操作側の在庫反映確認はT2-R2-002条件。 |
| B-003 | MOSTLY_CLOSED。既定は販売記録PII全匿名化。保持フィールド利用時はLegal/Privacy条件。 |
| B-004 | CLOSED。退会UIとサーバー確認フローの接続を確認。 |
| B-005 | PARTIAL。レート制限fail-closed、TTL/上限は改善。仮押さえストアfail-openはT2-R2-003条件。 |
| B-006 | CLOSED。管理経路は `requireAdmin()` 統一。 |
| B-007 | MOSTLY_CLOSED。canceled追加済み。Stripe Dashboard購読設定が必須。disputeは人手確認運用。 |
| B-008 | PARTIAL。メール系fail-closed/上限は改善。Turnstileは未実装・Sota判断。 |
| B-009 | PARTIAL。新規保存は同意制。旧localStorage値の無同意利用が残る。 |
| B-010 | CLOSED_CODE。CSP対応は妥当。実発火はステージング/本番前確認。 |
| B-011 | MOSTLY_CLOSED。SSR初期HTML/JSON-LDでSEO/AI可読性は改善。多言語SEOと実検索ツール確認は条件。 |
| B-012 | PARTIAL。文書/仕組みはあるが、復元訓練実績は未確認。 |
| B-013 | CLOSED。token系ページ no-store を確認。 |
| B-014 | NOT_CODE。DNS/メール認証/CAAはSota/DNS管理者作業。 |
| B-015 | MOSTLY_CLOSED。`.html`正規化は改善。多言語hreflang方針は条件。 |
| B-016 | CLOSED。inline `onload` は解消。 |
| B-017 | CLOSED。ユーザー向け署名リンクのHost依存は非本番fail-closedまで改善。checkout戻りURLは別条件。 |

### 6. 本番前条件（BALTHASAR票）

1. B-009: 旧 `kibi_shipping_<uid>` は同意フラグ無しなら削除/無視し、checkoutも同意フラグ必須にする。
2. T2-R2-002: `api-orders` の在庫 `updateData()` 結果を検査し、失敗時を成功扱いしない。
3. T2-R2-003: checkout仮押さえストア障害時の方針をSotaが明示。許容するなら重大アラート/日次照合を必須化。
4. T2-R2-004: Stripe Checkoutの戻り先URLを正規originまたはallowlist由来にする。
5. Stripe/Netlify/Firebase/Gmail/管理者MFA/バックアップ復元/GA実発火を、値ではなく設定状態として社長室が確認する。
6. Privacy Policyと削除/保持/バックアップ運用の文言をLegal/Sotaが整合させる。

### 7. Sotaへ上げる論点

- あり:
  - B-005 checkout仮押さえfail-openを本番初期リスクとして許容するか。
  - `DELETE_RETAIN_SHIPPING_FIELDS` を空（全匿名化）で行くか、会計目的で一部保持するか。
  - Turnstile、多言語SEO、DNS/メール認証、バックアップ復元訓練の実施時期。
  - ダッシュボード類の設定証跡をどの粒度で残すか（値ではなく状態・画面名・確認者・日時）。


---

## Round-1 記録（保持・改変禁止｜2026-06-13）

# BALTHASAR-2 審査 tpr-002

- 判定: **RETURN_TO_CODEX**
- 対象: tpr-001是正後 snapshot（branch `security/tpr-001`、commit `003ee82` と記載）
- 観点: 技術再審査。tpr-001 B-001〜B-016 + B-017 のコード閉塞、回帰、デプロイ可否。
- 結論: バックエンド/Edgeの主要是正は大きく前進している。ただし、今回の投入snapshotに変更対象のフロントJS実体が含まれず、B-004/B-009/B-010/B-011の重要部分を独立検証できない。重大変更の本番デプロイ判定としては資料不足のため差し戻し。

## 所見

### 1. ブロッカー
**T2-BL-001: フロントJS資産がsnapshotに含まれていない**
- 重要度: High
- 根拠: `evidence/diff-stat.txt` は `assets/js/main.js` と `assets/js/analytics.js` の変更を示す。一方、`inbox/snapshot/` 配下に `assets/js/` 実体が存在しない。`diff-functions.patch` にも該当フロント差分は含まれない。
- 影響: B-004（退会UI）、B-009（配送先PII/localStorage）、B-010（Cookie同意後Analytics発火）、B-011（main.js側JSON-LD二重注入抑止）を独立検証できない。
- 判定への影響: 本件だけで本番デプロイ可否は承認不可。完全なsnapshotまたは `diff-assets.patch` を再投入して再審査が必要。

## 指摘別再審査

| ID | 技術判定 | コメント |
|---|---|---|
| B-001 管理リセットURL Host依存 | CLOSED | `api-admin-auth.js` は `security.getCanonicalBaseUrl()` を使い、`Host` 不一致を拒否する。`URL` 本番設定が前提。 |
| B-002 Webhook失敗時再試行停止 | MOSTLY_CLOSED | PENDING/SUCCESS/FAILED化、重要処理失敗時500化を確認。ただし在庫マーカー書込失敗 + 販売記録書込失敗の連鎖では二重減算の狭い窓が残る。 |
| B-003 削除後住所PII残存 | MOSTLY_CLOSED | 販売記録のshipping各フィールド匿名化を確認。保持フィールドは `DELETE_RETAIN_SHIPPING_FIELDS` で可変。Legal判断とPrivacy文言整合が前提。 |
| B-004 退会UI未接続 | UNVERIFIED | サーバー側 `request` / `confirm` は妥当。フロント `main.js` 不在のためUIが正しく呼ぶか未検証。 |
| B-005 Checkout仮押さえ濫用 | PARTIAL | IP/メールレート制限、仮押さえ上限、TTL短縮、既定fail-closedは確認。一方、仮押さえ集計失敗・保存失敗時は決済続行で、オーバーセル/防御バイパス余地が残る。 |
| B-006 生ADMIN_TOKEN直受け | CLOSED | `api-subscribe.js` の管理経路は `security.requireAdmin()` に統一済み。 |
| B-007 返金/失敗/キャンセル遷移 | PARTIAL | `charge.refunded`、`payment_intent.payment_failed`、`checkout.session.async_payment_failed` は実装。`payment_intent.canceled` は未実装。`TPR-001_ADMIN_ACTIONS.md` にある `charge.dispute.created` もコード側は未対応。 |
| B-008 メール系API fail-open/Bot | PARTIAL | Contact/Newsletter/Restockはレートストア障害時fail-closed化、グローバル上限追加を確認。Turnstile等は提案のみ。 |
| B-009 配送先PII localStorage | UNVERIFIED | フロントJS不在のため、localStorage保存廃止/移行/削除導線を確認できない。 |
| B-010 Cookie同意後GA/GTM CSP阻害 | UNVERIFIED | CSP側はinline script非許可のまま。`analytics.js` 外部化が主修正と思われるが、ファイル不在で確認不可。 |
| B-011 JS描画SEO | PARTIAL | `ogp-rewrite.js` と `list-ssr.js` による商品/記事/一覧の初期HTML・JSON-LD注入は確認。main.js側の二重注入抑止は未検証。多言語SEOは方針待ち。 |
| B-012 バックアップ復元実績 | PARTIAL | 実装・管理チェックリストはある。復元訓練、暗号化、オフサイト、削除後PII運用は未証跡。 |
| B-013 tokenページ no-store | CLOSED | `/mypage.html`、`/confirm.html`、`/unsubscribe.html` に `no-store, private` を確認。 |
| B-014 DNS/メール認証/CAA | NOT_CODE | 草案のみ。Sota/DNS管理者作業。 |
| B-015 URL/canonical/hreflang混在 | MOSTLY_CLOSED | 静的リンク・canonical・sitemapは `.html` 統一へ改善。多言語hreflangの最終方針はフロントJS不在で未検証。 |
| B-016 font preload inline onload | CLOSED | HTMLは通常stylesheet読み込みに戻り、inline `onload` は残っていない。 |
| B-017 利用者向け署名リンクHost依存 | MOSTLY_CLOSED | 会員確認/Newsletter/再入荷通知はHost非依存化。ただし `URL` 未設定時に本番ドメインへフォールバックする箇所があり、Preview/検証環境では誤送信先になりうる。 |

## 追加所見

### T2-001: Checkout仮押さえストア障害時の残リスク
- 対象: `create-checkout.js:176-188`、`:307-319`
- 内容: 予約集計に失敗した場合は「仮押さえなし」として続行し、予約保存に失敗してもCheckoutセッションを返す。
- 影響: 在庫ブロック対策の実効性低下、オーバーセル、表示在庫と実売の不整合。
- 勧告: 予約集計失敗は503でfail-closedにする。予約保存失敗時はStripe Sessionを期限切れ/キャンセルできるなら補償処理し、できないなら少なくとも管理通知と日次照合の重大アラートに上げる。

### T2-002: 管理画面の販売記録操作で在庫だけ先に動く競合余地
- 対象: `api-orders.js:138-157`、`:174-221`
- 内容: delete/updateで在庫を先に更新し、その後に販売記録をCAS更新する。販売記録CASが409/404になっても、在庫変更は既に反映済み。
- 影響: 管理操作が競合した場合、販売記録と在庫が乖離しうる。
- 勧告: 在庫更新と販売記録更新を1つの整合単位として扱う。最低限、販売記録CAS失敗時に在庫補償処理を行うか、操作ロック/再試行キュー/照合アラートを追加する。

### T2-003: B-007の対象イベント定義が文書とコードでずれている
- 対象: `stripe-webhook.js:417-512`、`TPR-001_ADMIN_ACTIONS.md:193-205`
- 内容: 管理チェックリストは `charge.dispute.created` を購読対象に含めるが、コードは未処理。tpr-001で挙げたキャンセル系 `payment_intent.canceled` も未処理。
- 影響: 運用者が文書どおりStripe設定しても、紛争/取消の販売記録反映は起きない。
- 勧告: 反映対象イベントを確定し、コード・Stripe Dashboard設定・管理文書を一致させる。少なくとも未処理イベントを購読する場合はログ/通知/照合対象にする。

### T2-004: 利用者向けメールリンクのURL未設定時フォールバック
- 対象: `api-member-verify.js:155-157`、`api-newsletter.js:184-186`、`:370-373`、`api-subscribe.js:229-235`、`api-delete-account.js:188-196`
- 内容: Hostヘッダ依存は排除されているが、`process.env.URL` が解決できない場合に `https://kibi-fragrance.jp` へフォールバックする。
- 影響: 本番では実害は限定的だが、Preview/ステージング検証ではリンクが本番へ向く可能性がある。B-001の管理リセットはfail-closedなので、ユーザー向けも方針統一が望ましい。
- 勧告: 本番以外ではfail-closed、または明示された `URL` がない環境では送信停止にする。

## 良い点
- Secret実値らしき文字列はsnapshot/evidence内で確認されない。
- `node --check` はBALTHASAR側でも全 `netlify/**/*.js` に対して再実行し、構文エラーなし。
- 管理リセットのHost依存は共有ヘルパー化され、管理側はfail-closedで閉塞している。
- Webhookの重要処理失敗を500で返す設計になり、tpr-001の「失敗しても200で再試行停止」は大きく改善している。
- `api-contact` / `api-newsletter` / `api-subscribe` のレート制限fail-closed化とグローバル上限は、B-008への現実的な前進。
- SEO初期HTML注入は、商品/記事/一覧のAI/軽量クローラ可読性を上げる方向として妥当。
- font preloadのinline `onload` は解消済み。

## 未確認
- `assets/js/main.js` / `assets/js/analytics.js` の実装内容。
- B-004退会UIの実動線、B-009配送先PII保存方針、B-010同意前/拒否後/同意後のネットワーク発火。
- Stripe Dashboardの購読イベント、live/test分離、Webhook Secretローテーション。
- Netlify本番環境変数 `URL`、`DELETION_HMAC_SECRET`、`CHECKOUT_RATELIMIT_FAILOPEN`、`ALLOW_TOKEN_AUTH` の実値状態。
- Firebase/Gmail/DNS/管理者MFA、バックアップ復元訓練、Legalの保持方針。

## 勧告
1. **再投入必須**: `assets/js/main.js`、`assets/js/analytics.js`、関連する `confirm.js` / `unsubscribe.js` / `utils.js` の現物、または完全なasset差分を `tpr-002/inbox/snapshot/` と `evidence/` に追加する。
2. **再審査必須**: 上記フロント資産を受領後、B-004/B-009/B-010/B-011を再検証する。現時点では本番デプロイ不可。
3. Checkout仮押さえ集計/保存失敗時の方針をSotaが決め、決済優先で続行する場合は管理通知・日次照合・在庫補償手順を必須条件にする。
4. `api-orders.js` の在庫/販売記録の競合時不整合を補償する。
5. StripeのB-007対象イベントを文書とコードで一致させる。
6. Sota承認前に、管理画面証跡（Stripe/Netlify/Firebase/Gmail/DNS/MFA/復元訓練）を黒塗りで提出する。

## Sotaへ上げる論点
- 重大変更のデプロイ判断は、フロントJS現物がない状態では承認できない。
- Checkoutを「売上機会優先で一部fail-openにする」か「整合性優先でfail-closedにする」か。
- 削除要求後の会計保持範囲とPrivacy Policy文言。
- Analytics実発火確認を本番前ステージングで必須にするか。
- 多言語SEOを固有URLで育てるか、現時点ではhreflangを抑えるか。
