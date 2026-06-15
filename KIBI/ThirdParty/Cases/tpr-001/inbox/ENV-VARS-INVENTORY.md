# 環境変数 目録（名前のみ・値は不提供） ── tpr-001

コードが `process.env.X` で参照する変数名。**値はNetlify環境変数で管理されディスク/履歴には無い**（社長室確認済み）。BALTHASARは『どの秘密が必要で、どこで使われ、安全に管理されているべきか』の評価にこの一覧を使う。

| 変数名 | 推定用途 | 機微度 |
|---|---|---|
| STRIPE_SECRET_KEY | Stripe APIシークレット | Critical |
| STRIPE_WEBHOOK_SECRET | Webhook署名検証 | Critical |
| FIREBASE_API_KEY | Firebase Web設定（公開キー） | Info |
| FIREBASE_AUTH_DOMAIN | Firebase認証ドメイン | Low |
| FIREBASE_PROJECT_ID | FirebaseプロジェクトID | Low |
| SMTP_EMAIL / SMTP_APP_PASSWORD | メール送信（SMTP） | High |
| SMTP_FROM_NAME | 差出人名 | Info |
| ADMIN_EMAIL / ADMIN_NOTIFY_EMAIL | 管理者通知先 | Low |
| ADMIN_GATE_USER / ADMIN_GATE_PASS | 管理画面ゲート認証 | Critical |
| ADMIN_TOKEN | 管理API認証トークン | Critical |
| ALLOW_TOKEN_AUTH | トークン認証の許可フラグ | High（評価対象：本番で有効か） |
| CRON_SECRET | cron起動の保護 | High |
| DELETION_HMAC_SECRET | アカウント削除の署名 | High |
| NEWSLETTER_HMAC_SECRET | Newsletter署名 | High |
| NETLIFY_API_TOKEN | Netlify API操作 | Critical |
| NETLIFY_SITE_ID | サイトID | Low |
| SLACK_WEBHOOK_URL | Slack通知 | Medium |
| URL / CONTEXT / NETLIFY | Netlifyビルド環境変数（自動） | Info |

※ 評価観点例：ALLOW_TOKEN_AUTH が本番で有効だと管理APIがトークンのみで叩ける恐れ→要確認。ADMIN_GATE_PASS/ADMIN_TOKEN/各HMAC のローテーション運用。test/live鍵の分離。
