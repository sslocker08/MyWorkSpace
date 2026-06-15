# BALTHASAR-2 外部診断引き継ぎ書への回答

対象: `KIBI-fragrance セキュリティ・品質診断 引き継ぎ書`

判定: **既存BALTHASAR診断と概ね整合。追加回答として採用可。**

## 位置づけ
- 添付文書は、確定した脆弱性レポートではなく、外部公開面から診断を進めるための網羅的チェックリスト/引き継ぎ書。
- BALTHASARは `Cases/tpr-001/inbox/snapshot/` と `evidence/`、および公開サイトから確認可能な範囲で回答する。
- Internal本体、本番Secret値、顧客データには触れない。
- 実装・修正は行わない。回答と勧告のみ。

## 先方への総回答
- 診断観点は妥当。特に「Secret漏洩」「決済/Webhook」「管理画面」「API認可」「個人情報保存範囲」を最優先とする方針は、BALTHASAR診断と一致する。
- 既に確認できた範囲では、Secret実値漏洩、フロント価格信用、Webhook署名未検証、明白な注文IDORは見つからない。
- 一方、BALTHASARは以下を優先リスクとして回答する。
  1. 管理トークンリセットURLがHostヘッダ由来。
  2. Stripe Webhookが重要処理失敗後も成功応答し、Stripe再試行を止める。
  3. アカウント削除後も販売記録内の住所情報が残る。
  4. マイページ退会UIがサーバー側の本人確認削除フローに乗っていない可能性。
  5. Checkout仮押さえによる在庫ブロック余地。
  6. 一部管理APIに旧ADMIN_TOKEN直受け経路が残る。
  7. 返金・キャンセル・支払い失敗のステータス遷移不足。
  8. 公開メール系APIのBot対策がIPレート制限中心。
  9. Cookie同意後のAnalytics発火がCSPで阻害される可能性。
  10. JS描画中心のため、AI/SEOスキャン上不利になりうる。

## 基本情報への回答
| 項目 | 回答 |
|---|---|
| 技術スタック | 静的HTML + Netlify Functions(Node) + Netlify Edge Functions。`package.json` 依存は `@netlify/blobs`、`nodemailer`、`stripe`。 |
| ホスティング | Netlify。`netlify.toml` で `publish="."`、Functions/Edge Functionsを設定。 |
| DNS管理元 | 証跡ではNSが `01.dnsv.jp` から `04.dnsv.jp`。DNS事業者の管理権限者は未確認。 |
| CDN/WAF | Netlify Edgeは使用。WAF/Bot対策の有無は未確認。 |
| CMS/DB | 既製CMSではなく、管理画面 + Netlify Blobsによる独自データ管理と見える。 |
| 管理画面 | `admin.html` あり。Edge Basic gate + 管理トークン + メールOTP + セッションBlob。プラットフォーム側MFAは未確認。 |
| My Page | `mypage.html` あり。Firebase Authを使い、注文履歴APIはサーバー側でFirebase IDトークンとKIBI側メール確認を検証。 |
| 決済 | Stripe Checkout + Stripe Webhook。価格/送料はサーバー側データから決定。 |
| 環境変数 | 名前のみ提供済み。値は未提供で正しい。`ENV-VARS-INVENTORY.md` 参照。 |
| 管理者アカウント一覧 | 未提供。Netlify/GitHub/Firebase/Stripe/Gmail等を要確認。 |

## 外部公開面
- ページ導線: snapshot上は `/`、`/story`、`/collection`、商品詳細、`/news`、`/faq`、`/contact`、`/mypage`、法務ページ、404等が存在。
- robots/sitemap: 公開 `robots.txt` は全許可でsitemap指定あり。公開 `sitemap.xml` は主要ページ、商品URL、記事URLを含む。
- SEO/A11y/Performance: 商品ページのtitle/description/OGPはサーバー側で返るが、商品本文・価格・ノート・JSON-LDはJS描画寄り。JS非対応の診断/AIクローラでは本文が薄く見える可能性がある。
- URL設計: sitemapは `.html` 付きURL中心、ナビゲーションは拡張子なしURL中心。canonical/hreflangとの統一を推奨。

## HTTPヘッダー/TLS/DNS
- HTTPヘッダー: 実測でHSTS、CSP、nosniff、Referrer-Policy、Permissions-Policy、X-Frame-Options、frame-ancestors、COOP/CORPを確認。概ね堅牢。
- CSP: `script-src` に `unsafe-inline` はない。これは安全面では良いが、同意後にJSで追加するGA/GTM初期化scriptをブロックする可能性がある。
- Cache-Control: `/admin.html` はno-store。`/mypage` 等のトークン利用ページは public max-age=0 で、no-store化を推奨。
- Set-Cookie: 提供されたHEAD証跡では確認なし。Firebase Authのブラウザ側保持はFirebase SDK管理。
- TLS: HTTPS/HSTSは確認済み。TLSバージョン、証明書チェーン、HTTP→HTTPS強制は未確認。
- DNS: A/NSは確認。TXT/MX/CAAが空に見えるため、SPF/DKIM/DMARC/CAAは要確認。

## フロントエンド
- 商品データ: 公開 `/api/data` がNetlify Blobs `data.json` から機密情報を除外して返す構造。
- 価格: 公開データには価格表示用の価格が含まれるが、Checkout作成ではサーバー側商品データを正本として使っており、フロント価格を信用していない。
- APIキー: Firebase Web APIキーは公開キー扱い。ただしGoogle Cloud側のHTTPリファラー制限とFirebase承認済みドメインは要確認。
- source map: 公開 `main.js.map` / `utils.js.map` は404。公開source map露出は確認されない。
- localStorage: 配送先PIIを `localStorage` に長期保存しているため、保存方針と削除UIの改善を推奨。
- DOM XSS: 公開JSでは `KIBI.escapeHTML` / `nl2br` / `safeSrc` を広く使用しており、確認範囲で明白なDOM XSSは確認されない。
- Cookie同意: コード上、同意前にGA/GTMは注入しない。拒否時も発火しない設計。ただし同意後の実発火はCSPで阻害される可能性が高い。

## カート/注文/決済
- Checkout Session作成: サーバー側関数あり。商品ID/数量を受け、数量は整数・上限検証あり。
- 価格/送料: サーバー側 `data.json` の商品価格/Stripe Price ID/送料を使用。フロント価格信用は確認されない。
- 注文確定: `success_url` ではなく、Webhookで販売記録・在庫減算を行う設計。
- Webhook署名: `Stripe-Signature` と `STRIPE_WEBHOOK_SECRET` で検証あり。
- 冪等性: `session.id` ベースの冪等性あり。ただし処理前に冪等性キーを保存するため、失敗時に再処理されないリスクがある。
- 返金/キャンセル: `checkout.session.expired` は仮押さえ解除あり。返金・支払い失敗・キャンセル後の販売記録ステータス更新は不足。
- 在庫仮押さえ: Checkout未完了セッションで在庫を35分ブロックできるため、Bot/レート制限強化を推奨。

## My Page/認証
- My Pageは実装対象。
- Firebase IDトークンはサーバー側で `accounts:lookup` により検証。
- 注文履歴はメール一致だけでなく、KIBI側 `members-list.emailVerified=true` を要求しており、IDOR対策として良い。
- マイページ退会UIはサーバー側の本人確認削除申請フローに乗っていない可能性があり、個人情報削除不整合のリスクがある。
- パスワードポリシー、Firebase承認済みドメイン、Firebase Console側MFA/メール設定は未確認。
- 認証ページのCache-Controlはno-store推奨。

## 管理画面
- `/admin.html` はEdge FunctionのBasic認証でHTML配信前に保護される。未設定時は本番/Previewでfail-closed。
- 管理APIは多くが `security.requireAdmin()` によってOTP後セッションを要求する。
- 管理トークンリセットは無認証で要求でき、管理者メールへ送るリセットURLがHost由来。最優先修正。
- 一部の再入荷通知管理APIのみ、共通セッションではなく `ADMIN_TOKEN` 直比較が残る。共通ゲートへ統一推奨。
- Netlify/GitHub/Stripe/Firebase/Gmail等の管理者MFA・権限・退職者/外注者アカウントは未確認。

## API認可
- 公開APIと管理APIの区別は概ねある。
- CORSは本番で `process.env.URL` 起点の自サイトオリジンに寄せている。ただしCORSは認可ではないため、認証/署名/レート制限との併用が前提。
- CSRFは `X-Requested-With` 要求が中心。ブラウザの単純フォーム送信対策にはなるが、Bot/サーバー間リクエスト対策には不足。
- 入力検証は商品ID、メール、数量、画像MIME、管理データschemaなどで確認。
- 管理APIの全面的な操作ログはコード上では限定的。運用ログ要確認。

## Contact/Newsletter/Cookie
- Contact: メールヘッダー注入対策、本文長制限、IP/宛先単位レート制限あり。
- Newsletter: ダブルオプトイン、購読解除HMAC、管理者送信、予約送信あり。
- 再入荷通知: ダブルオプトインあり。
- Bot対策: Turnstile/reCAPTCHA等は確認できず。IPレート制限中心で、レートストア障害時にfail-openする箇所あり。
- Cookie同意: 公開設定では有効。コード上、同意前/拒否時にGA/GTMは注入しない。一方、同意後のGA/GTM初期化scriptはCSPでブロックされる可能性があるため、DevTools/GA DebugViewで要検証。

## Secrets/依存関係
- Secret実値: snapshot内には確認されない。レポートにも記載しない。
- Git履歴: 提供証跡ではSecret実値・PIIファイルの履歴混入なし。
- 環境変数: 値ではなく名前だけ提供されており、診断上適切。
- npm audit: 0件。
- npm outdated: `stripe` の最新majorがあり。ただし現行Wanted内では更新不要。破壊的アップデートは検証環境で判断。
- Dependabot/Renovate: 未確認。

## DB/ストレージ/バックアップ
- ストレージ: Netlify Blobs。主なストアは `kibi-site`、`kibi-members`、`kibi-newsletter`、`kibi-survey`、`kibi-backups` 等。
- バックアップ: `backup-core` が永続テキストデータを日次キーで30世代保存し、管理APIから復元できる設計。
- 対象外: 画像、決済中の一時予約、管理認証データ等はバックアップ対象外。
- 未確認: 実運用頻度、暗号化、オフサイト保管、復元テスト、バックアップ内PIIの削除方針。
- 削除依頼対応: 会員/Newsletter/再入荷/販売記録の一部匿名化はあるが、販売記録の住所フィールドが残る。Legal/Privacy Policyと合わせて修正が必要。

## 外部レポート内「Codexへの作業指示」への回答
- ThirdParty/BALTHASARは実装権限を持たないため、PR実装・軽微修正は行わない。
- ただし、作業順としては妥当。実装担当に渡す場合は、BALTHASARの優先順位に合わせて以下から着手すべき。
  1. 管理リセットURLの正規URL化とHost allowlist。
  2. Webhook処理状態/PENDING-SUCCESS-FAILED化と失敗時再試行。
  3. 削除/匿名化範囲と退会UIの修正。
  4. Checkout作成のレート制限/Bot対策。
  5. 管理APIの `requireAdmin()` 統一。
  6. 返金/キャンセル/支払い失敗ステータス追加。
  7. Cookie同意後のAnalytics発火検証とCSP対応。
  8. 商品本文/JSON-LDの初期HTML化によるSEO/AIクローラ対応。

## 依頼主に返す短文案
> 引き継ぎ書の診断観点は妥当です。こちらでコード・設定・公開サイト挙動と照合した限り、Secret実値漏洩、フロント価格信用、Webhook署名未検証、明白な注文IDORは確認されませんでした。一方で、管理リセットURLのHost依存、Webhook失敗時の再試行停止、個人情報削除後の住所残存、退会UIの削除フロー不整合は優先修正対象です。フロントJSとCookie同意は公開範囲で確認し、同意前発火は確認されない一方、同意後のAnalytics発火がCSPで阻害される可能性があります。Stripe/Netlify/Firebase/Gmailの管理画面設定、管理者アカウント/MFA、バックアップ復元実績は権限がないため、値ではなく設定状況と証跡の提出をお願いします。
