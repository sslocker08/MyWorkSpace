# JP2FR — コンテンツ更新ガイド（開発者向け）

データはすべてフラットファイル。**追加・削除 = ファイル操作 + 再デプロイ**のみ。

## ファウンダー追加
1. `src/content/founders/<slug>.json` を作成（既存ファイルをコピーして編集）。
   - `slug` はファイル名と一致（kebab-case）。`order` は表示順（一意の連番）。
   - `name`/`title`/`bio`/`region` は fr/en/ja 3言語すべて必須。
2. ポートレート画像を `public/img/founders/<slug>/portrait.(svg|jpg|webp)` に置き、JSON の `portrait` にパスを書く。
3. `node scripts/validate-content.mjs` で整合チェック → commit。

## 商品追加
1. `src/content/products/<slug>.json` を作成。
   - `founder` は既存ファウンダーの slug（validate が実在チェック）。
   - `price.amount` は **EURセントの整数**（例: €45.00 → 4500）。税込表示前提。
   - `stripe.priceId`: Stripe ダッシュボードで Product/Price を作成し ID を貼る（`price_PLACEHOLDER` のままだと checkout はサーバー側 price_data フォールバックで動く=テスト用）。
   - 一点物は `"stock": { "kind": "unique", "soldOut": false }`。売れたら `soldOut: true` に変更して再デプロイ（暫定運用）。
2. 画像を `public/img/products/<slug>/01.webp` 等に置き `images` 配列へ。
3. validate → commit。

## 削除
JSON ファイルと画像フォルダを削除するだけ。参照が残っていれば validate が落ちる。

## UI文言の変更
`src/i18n/{fr,en,ja}.json` — **3ファイルのキー構造は常に一致**させる（validate がキー欠落を検出）。`{name}` 等のトークンは3言語で揃えて維持。

## プレースホルダ画像の再生成
`node scripts/gen-placeholders.mjs`（слug から決定論的に生成・上書き）。本番画像を置いたら実行しない。

## 検証コマンド
```bash
node scripts/validate-content.mjs   # データ整合
pnpm check                          # 型
pnpm build                          # 全ページ生成
pnpm test                           # ユニットテスト
```
