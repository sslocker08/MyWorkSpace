# 審査依頼 tpr-001 ── kibi-fragrance.jp セキュリティ・品質診断（BALTHASAR単独）

- 依頼日: 2026-06-13 ｜ 依頼元: 社長室（Sota指示）
- 審査担当: **BALTHASAR-2（技術観点・GPT）単独**（純粋な技術/セキュリティ診断のため、MELCHIOR・CASPERは招集しない）
- 対象資産: 本番サイト `https://kibi-fragrance.jp` ＝ Internal/System（独自リポジトリ kibi-fragrance/kibi-fragrance）のソース・設定
- 種別: **READONLY 診断**（実装・修正はしない。レポートと勧告のみ）。これは ord に紐づかない**独立診断 Case**。
- 基準文書: `../../../Contracts/charter-public.md`・`../../../Contracts/master-agreement.md`・本書

## 0. あなた（BALTHASAR）の立場と鉄則
- あなたはKIBI-MAGIの技術審査人格。発注者（Claude=社長室）にも実装者にも属さない第三者。**編集権・実装権・承認権はない。勧告のみ。**
- 与えられた資料（`snapshot/` と `evidence/`）だけで審査する。**snapshot外のKIBI内部・本番Secret値・顧客データへはアクセスしない/要求しない**（必要なら§5の「依頼主へ要請」に列挙する）。
- レポートに**Secret値・APIキー・トークンの実値を書かない**（見つけた場合も値は伏せ、場所と種別のみ）。
- 簡潔体・結論先行・正直（未確認は「未確認」と明記）。

## 1. 診断目的（何を明らかにするか）
1. 重大なセキュリティリスクの有無　2. ECとして危険な実装　3. 個人情報・決済・注文の扱い　4. 管理画面・デプロイ環境の保護　5. Secret/環境変数/Webhook Secretの露出　6. 依存パッケージの既知脆弱性　7. Cookie同意・Contact・Newsletterの妥当性　8. 無駄・未実装導線・UX不備　9. 修正項目のリスク順整理。

## 2. 重点（KIBIの最重要順）
1. **Secret漏洩**（フロント混入・source map・Git履歴）
2. **決済・Webhook**：価格・送料・税を**サーバー側で再計算**しているか／フロントからの価格を信用していないか／注文確定を**Webhookを正**としているか／**Stripe-Signature署名検証**と**冪等性（event.id保存）**があるか／返金・キャンセルのステータス遷移
3. **注文・個人情報**：注文ID/ユーザーIDの**IDOR**（他人の注文・データ参照）／所有者チェック／保持範囲
4. **My Page/認証**：セッションCookie属性（Secure/HttpOnly/SameSite）／認可チェック／user_idをフロント信用していないか
5. **管理画面**（admin.html・edge-functions/admin-gate.js）：認証方式・MFA・IP/Zero Trust・最小権限・操作ログ・レート制限・ロック
6. **API認可**：公開/管理APIの区別・CORS・入力バリデーション・XSS/CSRF/インジェクション・Rate Limit
7. **HTTPセキュリティヘッダー**（evidence/http-headers.txt 参照）
8. **Cookie同意**：同意前のGA/GTM発火・拒否時の停止・再設定導線
9. **Contact/Newsletter**：CSRF・Bot対策・レート制限・メールヘッダーインジェクション・二重登録・解除導線
10. **依存パッケージ**（evidence/npm-audit.txt 参照）
11. **ログ/バックアップ**（data-backup.js・api-backup.js・newsletter-cron.js）
12. **SEO/アクセシビリティ/無駄導線**

## 3. 提供物（このinbox内）
- `snapshot/` … Internal/System のうち**コード・設定・認証/決済面**を抜粋（59ファイル）。除外＝images/assets（画像）・node_modules・.git・.netlify・実データ data.json（§4参照）。
  - 重点ファイル：`netlify/functions/*.js`（API/サーバーレス）、`netlify/functions/_shared/{security,validate-data,site-data,backup-core}.js`、`netlify/edge-functions/admin-gate.js`、`netlify.toml`（ヘッダ・リダイレクト）、`create-checkout.js`・`stripe-webhook.js`・`cancel-checkout.js`（決済）、`api-orders.js`・`api-user-orders.js`（注文）、`admin.html`・`mypage.html`、`firebase-rules.txt`、`package-lock.json`（依存）。
- `evidence/` … 社長室が読み取り専用で採取した実測証拠：
  - `npm-audit.txt`/`.json`（依存脆弱性）・`npm-outdated.txt`
  - `http-headers.txt`（本番HEADの実ヘッダ：/ /collection /mypage /legal /admin.html /robots.txt）
  - `dns.txt`（A/TXT/MX/CAA/NS・www）
  - `git-history-scan.txt`（kibi-fragrance履歴のSecret/PII走査結果）
- `ENV-VARS-INVENTORY.md` … コードが参照する環境変数の**名前のみ**（値は不提供。Netlify環境変数で管理）。

## 4. 既に社長室（内部監査）が確認済みの事実（前提として扱ってよい）
- **ディスク上のソースにSecret実値なし**。`.env`・PII系json（sales-records/inventory/members）・鍵ファイルは作業ディレクトリに存在せず、`.gitignore`で除外。値はNetlify環境変数・Netlify Blobsにある。
- **Git履歴クリーン**：履歴のSecretパターン95件は全て**裸のプレフィックス**（`whsec_`/`sk_test_`/`sk_live_`）で、出所は旧監査文書 `docs/SITE_AUDIT_2026-06-10.md`。20文字以上の実キー値はゼロ。PIIファイルも履歴に無し。
- `data.json` には Firebase Web APIキー（`AIzaSy…`）があるが**設計上クライアント公開される公開キー**（漏洩ではない）。ただし**Info級の論点**＝APIキーのドメイン/リファラ制限・Firebase Security Rulesの厳格化は評価対象。→ 該当は `data.example.json`（構造）と `firebase-rules.txt`・`api-firebase-config.js` で評価せよ（data.json実体は個人情報保護のため非提供）。
- 本番ヘッダは既に堅牢（CSP `frame-ancestors 'none'`・HSTS preload・nosniff・COOP/CORP・Permissions-Policy）。→ **CSPの実効性（connect-src/script-srcの広さ・unsafe-inline）**と**認証ページの Cache-Control（現状 max-age=0。no-store妥当性）**を精査せよ。

## 5. 未提供＝あなたが「依頼主へ要請」として列挙すべき項目（レポート末尾に）
コード/証拠だけでは判定できないもの。**値ではなく確認可否・設定状況**を要請として書く：
- Stripe管理画面：Webhook endpoint設定・signing secretのローテーション状況・test/live鍵分離・返金運用
- Netlify：環境変数の設定実体（名前は ENV-VARS-INVENTORY 参照）・Preview環境への本番Secret混入有無・デプロイ権限・アクセスログ
- 管理者アカウント一覧（Owner/Admin/Editor）・退職者/外注者アカウント・MFA有無・操作ログ
- DNS/メール認証：SPF/DKIM/DMARC/CAA（evidence/dns.txt では TXT/MX/CAA が空＝未設定の可能性。要確認）
- Firebase：Security Rules本番値・認可ドメイン制限・APIキー制限
- バックアップ：頻度・暗号化・復元テストの実績
- 外部サービス一覧（Stripe/SMTP/Slack/GA/GTM/Firebase 等）の利用状況

## 6. 出力（レポート形式｜契約 forms.md §11準拠）
出力先＝`ThirdParty/Cases/tpr-001/balthasar.md`（保存代行はSotaまたは社長室）。
- 冒頭に**判定**：`APPROVE / APPROVE_WITH_CONDITIONS / RETURN_TO_CODEX / RETURN_TO_CLAUDE / ESCALATE_TO_HUMAN / REJECT`（診断なので「現状の本番運用継続の可否＋条件」として用いる）。
- **サマリー**：総合評価／重大リスクの有無／すぐ直すべき／中期で直すべき／問題なしと判断／未確認。
- **各指摘**（リスク順）を次テンプレで：
```
ID:
タイトル:
重要度: Critical / High / Medium / Low / Info
対象: （snapshot内のファイル:行 または evidence）
概要:
再現/根拠:
影響:
証跡: （値は伏せる）
推奨修正:
修正難易度:
想定工数:
備考:
```
- 重要度基準：Critical＝Secret漏洩/決済改ざん可能/他人の注文閲覧/管理画面認証回避/個人情報大量漏洩。High＝Webhook署名未検証/管理画面MFAなし/重要API認可不備/価格をフロント信用/XSSで重要機能影響。Medium＝ヘッダ不足/CSRF不足/Cookie同意不備/Rate Limit不足/依存のHigh未満。Low＝エラー表示/軽微UX/不要console.log/SEO・A11y。Info＝改善提案。
- 末尾に**§5の依頼主への要請リスト**と、**Sotaへエスカレーションすべき論点**を明示。

## 7. 禁止
- 本番データの変更・実決済の発生・本番注文/顧客情報の削除・許可なき大量リクエスト/ブルートフォース・第三者影響の負荷試験。
- Secret値のレポート記載。snapshot外資産への直接アクセス。実装/修正（勧告のみ）。
