# 情報共有ログ ── tpr-001（契約 第16条・第20条7項｜security-policy §3）

書き手＝社長室。外部AI（BALTHASAR=GPT）へKIBI内部資産を共有する判断の記録。Sota承認＝2026-06-13（本診断の直接指示）。

## 1. 共有の必要性
- 目的＝kibi-fragrance.jp の技術/セキュリティ診断。コードと設定を見ずには診断不能のため、Internal/System のソースを審査に供する必要がある。
- 通常 External/ThirdParty は Internal を直接読まない（スナップショット供給）。本件もスナップショット方式で供給し、直接読み取りはさせない。

## 2. 内部監査ゲート（社長室が共有前に実測）
| 確認 | 結果 |
|---|---|
| ディスク上の `.env`・`.env.*` | 不在 |
| PII系json（sales-records/inventory-records/members） | ディスク・Git履歴とも不在 |
| 鍵ファイル（*.pem/*.key/*.p12） | 不在 |
| ソース中のSecret実値（20字以上） | ゼロ（`process.env.X` で名前参照のみ） |
| Git履歴のSecret（95ヒット） | 全て裸プレフィックス（旧監査文書 docs/SITE_AUDIT_2026-06-10.md 由来）。実値ゼロ |
| data.json の AIza キー | Firebase Web公開キー（設計上クライアント公開）。**snapshotから data.json を除外**し、構造は data.example.json で代替 |

## 3. 共有したもの（snapshot/ ＋ evidence/）
- snapshot/：コード・設定・認証/決済面 59ファイル（functions/edge/netlify.toml/HTML/package-lock/firebase-rules/data.example.json）。
- 除外：images・assets（画像バイナリ）・node_modules・.git・.netlify（状態）・**data.json（実データ＋公開キー）**。
- evidence/：社長室が読み取り専用で採取（npm audit・HTTPヘッダHEAD・DNS・Git履歴走査）。
- ENV-VARS-INVENTORY.md：環境変数の**名前のみ**（値は不提供）。

## 4. 共有していないもの（Tier0/Tier1）
- 環境変数の**値**（Stripe/HMAC/SMTP/ADMIN/Netlifyトークン等）＝Netlify管理。
- 顧客個人情報・注文実データ・販売記録（`_Records/`・Netlify Blobs）。
- `.secrets/`・他部署のInternal資産。

## 5. 役割終了後の扱い（security-policy §5｜Sota指示「不要データは役割を終えたら削除」）
- tpr-001クローズ時に社長室が `inbox/snapshot/` と `inbox/evidence/` を削除する（診断レポート `balthasar.md` と本ログ・request.mdは証跡として保持）。
- 削除記録は本ログ §6 に追記する。

## 6. 削除記録
- （クローズ時に追記）
