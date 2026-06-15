# 環境変数 目録（名前のみ・値は不提供）── tpr-002（是正後）

是正後コードが `process.env.X` で参照する変数名。**値はNetlify環境変数で管理されディスク/履歴には無い**（社長室確認済み・SHARING-LOG参照）。

## 既存（tpr-001から継続）
| 変数名 | 用途 | 機微度 |
|---|---|---|
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | Stripe API・Webhook署名検証 | Critical |
| ADMIN_GATE_USER / ADMIN_GATE_PASS / ADMIN_TOKEN | 管理ゲート・管理API | Critical |
| NETLIFY_API_TOKEN | Netlify API操作 | Critical |
| DELETION_HMAC_SECRET / NEWSLETTER_HMAC_SECRET / CRON_SECRET | 署名・cron保護 | High |
| SMTP_EMAIL / SMTP_APP_PASSWORD / SMTP_FROM_NAME | メール送信 | High/Low |
| SLACK_WEBHOOK_URL | Slack通知（reconcile-cron含む） | Medium |
| ALLOW_TOKEN_AUTH | トークン認証許可フラグ（本番有効性は要確認） | High |
| FIREBASE_API_KEY / FIREBASE_AUTH_DOMAIN / FIREBASE_PROJECT_ID | Firebase Web設定（公開キー） | Info/Low |
| ADMIN_EMAIL / ADMIN_NOTIFY_EMAIL / NETLIFY_SITE_ID | 通知先・サイトID | Low |
| URL / CONTEXT / NETLIFY | Netlify環境変数（自動・正規URL/Host対策の単一権威） | Info |

## 是正で新規に参照（本コミットで追加）
| 変数名 | 用途 | 既定 | 機微度 |
|---|---|---|---|
| CHECKOUT_RATELIMIT_FAILOPEN | checkout レート判定のストア障害時挙動（B-005）。未設定=fail-closed（安全側） | 未設定=fail-closed | Low（運用ノブ） |
| DELETE_RETAIN_SHIPPING_FIELDS | アカウント削除時に会計目的で残す住所フィールド（B-003）。未設定=全PII匿名化 | 未設定=全匿名化 | Low（ポリシーノブ） |

## 運用ノブ（実装済み・create-checkout.js が env で上書き可｜既定値はコード内）
| 変数名 | 用途 | 既定 | 機微度 |
|---|---|---|---|
| CHECKOUT_RL_IP_MAX | IP単位の checkout 作成上限（B-005） | 8 | Low（運用ノブ） |
| CHECKOUT_RL_IP_WINDOW_MS | IP単位のレート判定ウィンドウ(ms) | 60000（1分） | Low（運用ノブ） |
| CHECKOUT_RL_EMAIL_MAX | メール単位の checkout 作成上限 | 10 | Low（運用ノブ） |
| CHECKOUT_RL_EMAIL_WINDOW_MS | メール単位のレート判定ウィンドウ(ms) | 600000（10分） | Low（運用ノブ） |
| CHECKOUT_RESERVE_MAX_RATIO | 在庫に対する未決済仮押さえ上限比率（0〜1） | 0.5 | Low（運用ノブ） |
| CHECKOUT_RESERVE_MAX_ABS | 仮押さえ上限の絶対下限（小ロット保護） | 20 | Low（運用ノブ） |

## 提案のみ（**まだコード未参照**＝鍵入手・決裁後に実装）
| 変数名 | 用途 | 状態 |
|---|---|---|
| TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY | Bot対策（B-008）。Cloudflare Turnstile導入時に必要 | 未実装（docs/TPR-001_ADMIN_ACTIONS 提案） |

※ レビュー観点：本番Netlifyで `URL`（正規ドメイン）・`DELETION_HMAC_SECRET` が設定されていることがB-001/B-004/B-017の前提（デプロイ時確認）。
