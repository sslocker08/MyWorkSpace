# 発注書 ord-codex-004：販売集計CSV→正規化JSON 変換＋スキーマ検証（FIN補助）

- ステータス: 準備中  <!-- STATE: 準備中 LEVEL: 中規模 GATE: auto -->  <!-- Codex再起動(契約v0.2正式採用)後に STATE=発注済へ。書き手=社長室 -->
- 発注日: 2026-06-13 ｜ 委託先: Codex ｜ 依頼元部署: FIN（経理・財務部）｜ 変更区分: 中規模
- 目的: 各チャネルの売上CSVを、集計用の正規化JSONへ変換し**スキーマ検証**する補助ツール。経理の手集計を減らす。**実データは扱わない**（ダミーCSVで開発）。
- 作業内容:
  - Node標準のみのCLI `csv-normalize.js`。使い方 `node csv-normalize.js <csv...>`。
  - 入力CSV列＝`date,channel,product_id,qty,unit_price,amount`（`inputs/sample-channels.csv` 参照）。
  - 出力＝`[{date,channel,product_id,qty,unit_price,amount}]` のJSON配列（型正規化：数値列は数値化・日付はYYYY-MM-DD検証）。
  - **スキーマ検証**：必須列欠け・型不正（qtyが非整数等）・amount≠qty*unit_price の不整合を「行番号: 規則: 内容」で警告。違反あり=終了コード1。
  - 集計（チャネル別/商品別の qty・amount 合計）は**オプション** `--summary` で出力（任意）。
- 対象範囲: `External/Codex/Orders/ord-codex-004/work/` のみ。
- 範囲外: 実販売データ・`_Records/`の要求／会計判断（原価・粗利計算）の実装／外部依存。
- 受入基準: acceptance-criteria.md 参照。第三者審査: 不要（中規模・補助ツール・実データ不使用）。

## 投入資料チェック（security-policy §3）
| 投入 | 元 | Tier | マスキング |
|---|---|---|---|
| inputs/sample-channels.csv | 創作ダミー（架空数値9999・1行は型不正の既知違反） | 2 | 不要（創作） |

## 共有情報
- 渡した範囲: 創作ダミーCSVのみ。実売上・原価・`_Records/`は不投入。

## ロック
- 凍結Internal側: なし（新規ツール。受入後 Internal/Finance/ or Secretary/tools/ へ社長室が配置）。
