# KIBI 情報保護方針（security-policy）

版：v1.0（2026-06-12｜Sota承認・dec-014）。改訂はSota承認必須（契約 第20条6項）。

## 1. 機密区分（Tier）
| Tier | 区分 | 対象 | 扱い |
|---|---|---|---|
| 0 | 不可侵 | `.secrets/` 全件／`_Records/` 全件／顧客個人情報／認証情報・APIキー・トークン実値／**調香処方・レシピ・原料構成の原本**（`Internal/Development/` 配下）／Stripe・Firebase・Netlifyの実設定値 | いかなる形でも外部AI（Codex・MAGI含む）へ渡さない。Gitにも入れない |
| 1 | 社内限り | 未公開戦略（Planning）／原価・利益の実数（Finance）／法務係争・交渉中案件／未公開ブランド構想／status実データ一式 | Internalのみ。例外共有は要約・抽象化のうえSota承認必須 |
| 2 | 案件共有可 | ツール・サイトのソースコード（秘匿値除去後）／テンプレート・様式／公開済み文書／ダミーデータ | マスキング後、当該案件の `inputs/`（MAGIは `inbox/`）に限定投入 |
| 3 | 公開済み | kibi-fragrance.jp 公開情報・公開SNS | 制限なし |

## 2. 共有禁止リスト（初版）
- `/.secrets/**`・`/_Records/**`・`/Kofukuron23/**`（不可侵領域）
- `Internal/Development/**` の処方・調合・原料データ
- `Internal/Finance/**` の実数データ・`Internal/Secretary/status/**` の実データ
- 認証情報・鍵・トークンを含む一切のファイル（`Internal/System/` 内の env・config 実値を含む）
- 追加・解除はSota承認のうえ本リストを改訂する。

## 3. 発注時のマスキング手順（社長室の義務）
1. 投入予定の各ファイルをTier判定する（発注書の投入資料チェック欄）。
2. Tier2はマスキング（鍵・実URL・実データ・個人名の除去／ダミーデータへの差し替え）を実施してから `inputs/` へ複製する。
3. 投入ファイル一覧とTier判定を発注書「共有情報」欄に記録する（＝外部AIへ渡した範囲の記録）。
4. Tier1を例外共有する場合は、要約・抽象化版を作成し、事前にSota承認を得て、承認記録を発注書に残す。
5. 迷ったら渡さない。情報保護上の懸念はSotaへエスカレーションする。

## 4. ツール側の防火壁
- ダッシュボード要約（Ollama）・レビュー資料生成は `_Records/`・`.secrets/`・`Kofukuron23/` を読まない（tools実装済み）。
- External・ThirdPartyの席は各領域のCWDで起動し、領域外の読み取りを規約（AGENTS.md／README.md）で禁止する。

## 5. データの保持と削除
- **証跡（文書類）**＝発注書・宣言・レポート・判定・記録：削除・改変禁止（契約 第17条）。
- **データ類**＝`inputs/` のスナップショット・ダミーデータ・一時ファイル：**役割を終えたら削除する**（Order完了時に社長室が実施し、`decision/integration.md` に削除記録を残す）。
- 差し戻し対応中は削除しない（再作業に必要なため）。

## 6. Git運用の安全規程
- リポジトリ：private `kibi-fragrance/KIBI`（GitHub・kibi.fragrance@gmail.com 管理）。**公開設定の変更・コラボレータ追加・第三者アプリ連携はSotaのみ**。
- 除外（.gitignore 正本）：`_Records/`・`.secrets/`・`Kofukuron23/`・`Internal/System/`（独自リポジトリ）・`.DS_Store`・ダッシュボード要約キャッシュ・`.claude/settings.local.json`。
- **コミット前チェック**：①ステージ対象に共有禁止リスト該当がないか ②鍵・トークンのパターンスキャン（`sk-`・`ghp_`・`AIza`・`pk_live`・`sk_live`・`BEGIN PRIVATE KEY`・`password=` 等）③不一致があれば即時除外し記録。
- 強制push（force push）・履歴の書き換えは原則禁止（万一の機密混入時の除去のみ例外＝Sota承認）。
- push先の追加（別リモート）はSota承認必須。

## 7. 外部AI受け入れの前提条件（ord-001前）
1. 認証情報ローテーションの完了（社長作業）。
2. 本方針・契約・AGENTS.mdの整備完了。
3. 初回はダミーデータ案件（Tier2のみ）で試運転。
