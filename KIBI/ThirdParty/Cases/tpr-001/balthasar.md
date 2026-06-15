# BALTHASAR-2 技術審査レポート tpr-001

判定: **APPROVE_WITH_CONDITIONS**
最終更新: 2026-06-13 JST

## 位置づけ
- 対象: `https://kibi-fragrance.jp`
- 役割: ThirdParty/BALTHASARによる独立技術審査。実装・設定変更は行わず、勧告のみ。
- 情報保護: Secret値、管理画面の実値、個人情報は記載しない。管理画面系は「値」ではなく「設定状況・証跡」を確認対象にする。
- 統合範囲: Internal社長室から供給された `tpr-001` 依頼、提供snapshot/evidence、外部一般個人レポートへの回答、公開サイトから追加確認できたフロントJS/Cookie/SEO観点を本書へ一本化した。

## 追加で実施した公開面確認
- 公開HTML/JS: `/`, `/product.html?id=passed-down`, `/privacy.html`, `/assets/js/main.js?v=202604051400`, `/assets/js/utils.js?v=202604051400` を確認。
- 公開API: `/api/data`、`/api/firebase-config` を確認。Firebase公開Web設定は値を記載せず、項目の有無だけ評価。
- Cookie/Analytics: 公開設定ではCookie同意が有効、GA4設定は存在、GTM設定は未設定。コード上は同意前にGA/GTMを注入しない。
- SEO: `robots.txt`、`sitemap.xml`、商品ページのHTML head、JS描画範囲、canonical/hreflang生成を確認。
- HTTPヘッダ: 本番レスポンスのCSP/HSTS/Cache-Control等を再確認。
- source map: `main.js.map` / `utils.js.map` は404で、公開source map露出は確認されない。

## 確認できない領域
- Stripe/Netlify/Firebase/Gmailの管理画面設定、管理者アカウント/MFA、実環境のSecret値、バックアップ復元実績は、管理権限がないため直接確認不可。
- ただし本書の「管理画面・運用証跡の確認依頼」に、提出すべき証跡を具体化した。
- Cookie同意のネットワーク実発火は、ブラウザDevTools/GA DebugViewでの最終確認が必要。ただし公開コードとCSPから、同意後の発火阻害リスクを特定した。

---

## 重要所見

## B-001
タイトル: 管理トークンリセットURLがリクエストHostヘッダ由来
重要度: High
対象: `snapshot/netlify/functions/api-admin-auth.js:231` / `:251` / `:254` / `:258`
概要: 無認証の `request-reset` が管理者宛に送るリセットURLを `event.headers.host` から生成している。
影響: Netlify/プロキシ側でHostヘッダまたは別ホスト名が攻撃者に影響可能な場合、管理者がメールリンクをクリックするとリセットトークンが攻撃者ドメインへ渡り、管理トークンを差し替えられる可能性がある。
推奨修正: リンク生成は `process.env.URL` 等の正規URLのみを使う。Hostはallowlist検証し、未知Hostは拒否。修正完了まで管理リセットを一時停止する判断も検討。

## B-002
タイトル: Stripe Webhookが重要処理失敗後も成功応答し、再試行を止める
重要度: High
対象: `snapshot/netlify/functions/stripe-webhook.js:79` / `:88` / `:111` / `:188` / `:343`
概要: Webhookの冪等性キーを処理前に保存し、在庫・販売記録更新に失敗しても例外を握りつぶして最終的に200を返す。
影響: 支払い完了済みなのに販売記録未登録・在庫未減算・通知未送信となり、Stripeの自動再試行も抑止される。
推奨修正: `event.id` と処理状態（PENDING/SUCCESS/FAILED）を保存し、販売記録・在庫更新成功後にSUCCESSへ移す。重要処理失敗時は非2xxまたは確実な再処理キューへ。

## B-003
タイトル: アカウント削除後も販売記録の住所情報が残る
重要度: High
対象: `snapshot/netlify/functions/stripe-webhook.js:154` / `:172` / `snapshot/netlify/functions/api-delete-account.js:122` / `:130`
概要: Stripe注文時に配送先住所を販売記録へ保存するが、削除処理では `customer_email` と `shipping.name` しか匿名化していない。
影響: ユーザーには「個人情報を削除しました」と返す一方、住所等の個人情報が保持される。
推奨修正: 会計上保持が必要な範囲をLegal判断で定義し、削除要求時は住所・電話・氏名・自由記述内の個人情報を匿名化する。保持する場合は画面文言/Privacy Policyを合わせる。

## B-004
タイトル: マイページのアカウント削除UIがサーバー側の本人確認削除フローに乗っていない可能性
重要度: High
対象: 公開 `main.js:3082-3094` / `snapshot/netlify/functions/api-delete-account.js:191` / `:223-266`
概要: 公開JSの削除ボタンは `/api/delete-account` へ `{ email }` だけをPOSTし、`action:'request'` とFirebase IDトークンを送らない。サーバー側は省略時 `action='admin'` となり、管理者認証を要求する。
影響: サーバー側削除が401等で失敗してもJSは握りつぶし、その後Firebaseアカウント削除を進める。利用者は退会できたと思っても、KIBI側の会員/販売記録/Newsletter等の個人情報が残る可能性がある。
推奨修正: UIは `action:'request'` と `Authorization: Bearer <Firebase ID token>` で確認メール送信を開始し、`action:'confirm'` 完了後にFirebaseアカウント削除へ進む。サーバー削除失敗時はFirebase削除へ進めない。

## B-005
タイトル: Checkout仮押さえを悪用した在庫ブロックが可能
重要度: Medium
対象: `snapshot/netlify/functions/create-checkout.js:21` / `:75` / `:107` / `:198`
概要: Checkout作成APIにレート制限やBot証明がなく、未決済セッションの仮押さえが在庫計算から差し引かれる。
影響: 攻撃者がCheckoutセッションを大量作成すると、実在庫がある商品でも購入不可に見える。
推奨修正: IP/メール/商品単位のレート制限、Turnstile等のBot対策、同一カートの仮押さえ上限、短めTTL、未完了セッション監視を追加する。

## B-006
タイトル: 一部管理APIが共通管理セッションではなく生ADMIN_TOKENを直接受理する
重要度: Medium
対象: `snapshot/netlify/functions/api-subscribe.js:29` / `:92`
概要: 再入荷通知削除だけローカル `isAdmin()` で `ADMIN_TOKEN` を直接比較している。
影響: 旧ADMIN_TOKEN漏洩時やカスタムトークンリセット後でも、この限定管理操作だけ2FA/セッション設計を迂回できる。
推奨修正: `isAdmin()` を廃止し、`await security.requireAdmin(event)` に統一する。

## B-007
タイトル: 返金・キャンセル・支払い失敗のステータス遷移がWebhookにない
重要度: Medium
対象: `snapshot/netlify/functions/stripe-webhook.js:75` / `:331` / `snapshot/netlify/functions/cancel-checkout.js:44`
概要: Webhookは `checkout.session.completed` と `checkout.session.expired` だけを扱い、返金・キャンセル・支払い失敗後の販売記録更新がない。
影響: Stripe上で返金・キャンセルしても販売記録、在庫、発送状態、会計用ステータスに反映されない可能性がある。
推奨修正: Stripeイベントごとに `payment_status`、`refunded_at`、`refund_amount`、`canceled_at` を販売記録へ反映し、日次照合を追加する。

## B-008
タイトル: 公開メール系APIのBot対策がIPレート制限中心で、失敗時fail-open
重要度: Medium
対象: `snapshot/netlify/functions/api-contact.js:44` / `api-newsletter.js:95` / `api-subscribe.js:178` / `api-member-verify.js:78`
概要: Contact、Newsletter、再入荷通知、会員確認メールはレート制限を持つが、Blobレート制限失敗時は処理続行し、Bot証明はない。
影響: 分散BotによりSMTP送信枠の消費、迷惑メール評価低下、管理通知ノイズが起きうる。
推奨修正: Turnstile等のBot証明、グローバル送信上限、レートストア障害時の安全側制御、SMTP送信失敗率アラートを追加する。

## B-009
タイトル: 配送先PIIをlocalStorageへ長期保存している
重要度: Medium
対象: 公開 `main.js:2872-2873` / `:2924-2936` / `:3067` / `:1742-1752`
概要: マイページの配送先（氏名・郵便番号・住所・電話）が `localStorage` に `kibi_shipping_<uid>` として保存され、Checkout時に読み出される。
影響: XSS、悪性拡張機能、共有端末、端末盗難時に住所/電話が読み取られる。ログアウト後も明示削除まで残る。
推奨修正: 保存しない/都度入力を既定にする、またはサーバー側で認証付き保存に寄せる。最低限、保存/削除の明示UI、保存期間、Privacy Policyへの記載、ログアウト時削除オプションを設ける。

## B-010
タイトル: Cookie同意後のGA/GTM実発火がCSPで阻害される可能性が高い
重要度: Medium
対象: 公開 `main.js:1423-1488` / 本番CSP `script-src` / 公開 `/api/data`
概要: Cookie同意は有効で、GA4設定は存在する。コード上は同意前にGA/GTMを注入しないため、プライバシー面の方向性は良い。一方、同意後に `textContent` で追加するGA初期化scriptとGTM bootstrapは、現在のCSPがinline scriptを許可していないためブラウザにブロックされる可能性が高い。GTM設定は現時点で未設定。
影響: 利用者が同意してもAnalyticsが正しく計測されない。Cookie同意の「実発火」確認では、同意前発火よりも同意後不発が主な懸念。
推奨修正: 同意後に読み込む外部JSファイルへ初期化処理を移す、またはnonce/hash付きCSPへ設計変更する。GA DebugView/DevTools Networkで、同意前・拒否後・同意後の3状態を検証する。Privacy Policyにサイト内再選択手段を明記する。

## B-011
タイトル: 商品・ニュース本文と構造化データの多くがJS描画で、AI/SEOスキャン上不利になりうる
重要度: Medium
対象: 公開 `/`, `/product.html?id=passed-down`, `main.js:1116-1228` / `:1491-1552`
概要: 商品ページのtitle/description/OGPはサーバー側で返っている。一方、商品本文、価格、ノート、関連商品、Product JSON-LD等の主要内容はJS実行後に描画される。トップページも商品/ニュース/ブランド本文の一部が空コンテナで返り、JS後に埋まる。
影響: GoogleはJSをレンダリングできる可能性があるが、SEO診断ツール、SNS/AIクローラ、軽量bot、JS無効環境では本文が薄く評価される。「見た目は良いがAIスキャンでSEO的に不利」という伝言は、この構造に根拠がある。
推奨修正: 商品詳細・商品一覧・ニュース本文・主要ブランドコピー・Product/Breadcrumb/Organization JSON-LDを、HTMLまたはEdge Functionで初期HTMLに出す。最低限、商品ページ本文とJSON-LDはサーバー/Edge側で返す。

## B-012
タイトル: バックアップ実装はあるが、暗号化・オフサイト・復元実績が未確認
重要度: Medium
対象: `snapshot/netlify/functions/_shared/backup-core.js:13-15` / `:69-84` / `:101-119`、`api-backup.js:26-71`、`data-backup.js:23-25`
概要: Netlify Blobs上の `kibi-site`、`kibi-members`、`kibi-newsletter`、`kibi-survey` を日次で `kibi-backups` に30世代保存し、管理APIから復元できる実装はある。画像・一時決済データ・管理認証データは対象外。
影響: 実復元訓練、バックアップ暗号化、オフサイト保管、バックアップ内PIIの削除方針が未確認。復元できる前提で運用すると、障害時に回復できない可能性や、削除要求後PIIがバックアップ内に残るリスクがある。
推奨修正: 四半期ごとの復元訓練、復元前後の件数照合、復元ログ、オフサイト/別権限保管、アプリケーション層暗号化の要否、削除要求後バックアップPII保持方針を文書化する。

## B-013
タイトル: My Page等のトークン利用ページが no-store ではない
重要度: Low
対象: `snapshot/netlify.toml:60` / `evidence/http-headers.txt:49`
概要: `/admin.html` は no-store だが、`/mypage` は `public,max-age=0,must-revalidate`。確認・削除トークン付きURLの着地点でもある。
推奨修正: `/mypage.html`、`/confirm.html`、`/unsubscribe.html` などトークン利用ページに `Cache-Control: no-store, private` を設定する。

## B-014
タイトル: DNS/メール認証/CAAが未設定に見える
重要度: Low
対象: `evidence/dns.txt:3`
概要: 実測証跡ではTXT、MX、CAAが空。コード上はGmail SMTP利用が前提で、公開ページの連絡先もGmailアドレス。
影響: 独自ドメインでメール送信する場合、SPF/DKIM/DMARC未整備は到達性・なりすまし対策に弱い。CAA未設定は証明書発行制御の面で余地が残る。
推奨修正: Gmail運用を継続するか独自ドメインメールへ移行するか決め、必要に応じてSPF/DKIM/DMARC/CAAを設定する。

## B-015
タイトル: sitemap/canonical/hreflangのURL設計が混在している
重要度: Low
対象: 公開 `sitemap.xml` / 公開HTML nav / `main.js:500-517` / `:1501-1517`
概要: sitemapは `.html` 付きURL中心だが、ナビゲーションは `/collection` など拡張子なしが多い。JSは現在のpathをcanonical化するため、同じ内容でURL表記が割れる可能性がある。またhreflangは英中韓を同一URLへ向けており、localStorage翻訳ベースのため検索エンジンが別言語ページとして扱いにくい。
推奨修正: URL正規形を `.html` 付き/なしのどちらかに統一し、リダイレクト・canonical・sitemapを一致させる。多言語SEOを狙う場合は `/en/` 等の固有URLを用意する。狙わない場合はhreflangを削る。

## B-016
タイトル: CSPがフォントpreloadのinline onloadをブロックする可能性
重要度: Low
対象: 公開HTML `link rel=preload ... onload=...` / 本番CSP `script-src`
概要: Google Fontsのpreloadを `onload` 属性でstylesheet化しているが、CSPの `script-src` はinline event handlerを許可していない。
影響: ブラウザによってはフォントstylesheet化が動かず、noscript fallbackは通常JS有効環境では効かない。表示品質/速度計測に揺れが出る。
推奨修正: 通常のstylesheet読み込みに戻す、またはCSPに適合した外部JS/nonce設計へ移す。

---

## 問題なし・良い設計と判断した事項
- Secret実値: snapshot内にSecret実値は確認できず、履歴スキャンも実値なしとの証跡。`git-history-scan.txt:6-10`。
- 依存脆弱性: `npm audit` は0件。`npm-audit.json:3-11`。
- 決済価格: Checkout作成時、商品名・価格・Stripe Price IDはサーバー側 `data.json` を正本として使用。フロント価格信用は確認されない。
- Webhook署名: `Stripe-Signature` と `STRIPE_WEBHOOK_SECRET` による署名検証あり。
- 注文IDOR: 注文履歴APIはFirebase IDトークンをサーバー検証し、KIBI側メール確認済み会員のみ許可。
- 管理画面: Edge Basic gateは未設定時fail-closed。本番 `/admin.html` は401/no-store。
- 公開データ: `data.json` / `sales-records.json` / `members.json` 等はNetlify redirectsで404化。
- HTTPヘッダ: HSTS、CSP、frame-ancestors、nosniff、Referrer-Policy、COOP/CORPあり。概ね堅牢。
- フロントXSS対策: 公開JSは `KIBI.escapeHTML` / `nl2br` / `safeSrc` を広く使っており、公開確認範囲で明白なDOM XSSは確認されない。
- Cookie同意: コード上、同意前はGA/GTM注入を行わない。拒否時も `declined` を保存し、以後注入しない。
- Firebase公開設定: `/api/firebase-config` はXHR要求時のみ公開Web設定を返す。値は公開キー扱いで、Secretではない。ただしAPIキー制限は管理画面で要確認。
- source map: 公開JSのsource map参照・公開 `.map` は確認されない。

## 外部一般レポートへの統合回答
- 外部レポートの観点は妥当。Secret漏洩、決済/Webhook、管理画面、API認可、個人情報保存範囲、バックアップ、Cookie/SEOを確認すべきという方向性はBALTHASAR診断と一致する。
- 既に確認できた範囲では、Secret実値漏洩、フロント価格信用、Webhook署名未検証、明白な注文IDORは確認されない。
- 追加で、公開フロントJS確認により B-004、B-009、B-010、B-011、B-015、B-016 を本書へ採用した。
- 「フロントJS、Cookie同意の実発火」は、公開コード・公開設定・CSPまで確認済み。最終のネットワーク発火確認は、GA DebugView/DevToolsでの同意前/拒否後/同意後テストが必要。
- 「Stripe/Netlify/Firebase/Gmailの管理画面設定、管理者アカウント/MFA、バックアップ復元実績」は、権限がないため直接確認不可。下記証跡の提出で確認する。

## 管理画面・運用証跡の確認依頼
値そのものではなく、設定状況・スクリーンショット・ログ抜粋・一覧の提出を依頼する。Secretや個人情報は黒塗りでよい。

### Stripe
- 本番/テスト鍵の分離、制限付きキー利用有無、Webhook endpoint URL、購読イベント一覧、署名Secretローテーション日。
- `checkout.session.completed` と販売記録/在庫の直近照合結果。
- 返金・キャンセル・支払い失敗時の運用手順、返金済み注文の販売記録反映有無。
- Stripe Teamの権限者一覧、MFA必須化、退職者/外注者アカウントの有無。

### Netlify
- 本番/Deploy Preview/Branch Deployの環境変数分離。特に `ALLOW_TOKEN_AUTH` の本番値。
- `ADMIN_GATE_*`、`ADMIN_TOKEN`、HMAC、SMTP、Stripe、Firebase、Netlify API Tokenのローテーション日。
- Team権限者一覧、MFA必須化、Deploy権限、Deploy/Function/Edgeログ確認手順。
- Netlify Blobsのバックアップ、保持、アクセス権限、削除対応方針。

### Firebase / Google Cloud
- Authenticationの有効プロバイダ、承認済みドメイン、メール確認/パスワードリセットテンプレート。
- Firebase/Google Cloud APIキーのHTTPリファラー制限。許可範囲が本番ドメインと必要な開発環境に限定されているか。
- Firebase Console / Google Cloud IAMの権限者一覧、MFA、退職者/外注者アカウント。
- Firestore未使用であっても、Rulesがデフォルト拒否になっているかのコンソール証跡。

### Gmail / SMTP
- `SMTP_EMAIL` が個人GmailかWorkspaceか、2段階認証/MFAが有効か、アプリパスワードの発行日・保管場所・ローテーション日。
- Gmailの委任、転送、POP/IMAP、外部アプリ連携、復旧メール/電話の管理状況。
- 送信量上限・バウンス・迷惑メール判定の監視方法。
- 独自ドメイン送信を使う場合はSPF/DKIM/DMARCの証跡。

### 管理者アカウント/MFA
- Netlify、GitHub、Stripe、Firebase/Google Cloud、Gmail/Workspace、DNS管理元、Slack等のOwner/Admin/Editor一覧。
- 退職者・外注者・一時作業者の残存アカウント有無。
- MFA必須化、復旧コード保管、共有アカウント禁止、権限レビュー頻度。

### バックアップ/復元
- 直近バックアップ一覧、対象ストア、保持世代、暗号化・オフサイト保管の有無。
- 直近復元テスト日時、対象、復元前バックアップ取得、復元後件数照合、失敗時の巻き戻し手順。
- 画像バックアップ方針、削除要求後のバックアップ内PII保持期間と削除/期限切れ運用。

## Sotaへエスカレーションすべき論点
- B-001: 管理リセットURLのHost依存。修正完了まで `request-reset` を一時停止するか判断。
- B-002: Stripe完了セッションと販売記録の即時照合。欠落があれば発送・会計・顧客対応の人間判断が必要。
- B-003/B-004: 「退会」「削除」「会計上保持」の境界。Privacy Policy/画面文言/バックアップ保持方針をSota・Legalで決める。
- B-010/B-011: Cookie同意・Analytics・SEOの品質課題。ブランド成長に直結するため、セキュリティ修正と並行して改善計画に入れる。
- 管理画面系: Stripe/Netlify/Firebase/Gmail/DNSの権限者・MFA確認は、BALTHASARではなく管理者本人の証跡提出が必要。
