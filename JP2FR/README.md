# JP2FR ── 日本 → フランス 越境ECサイト

日本の個人製作プロダクト（工芸・イラスト・衣類）を、15のファウンダー（ブランド）からフランスへ届ける越境ECサイト。
浮世絵・和紙を基調にした「絵巻物」構造のインタラクティブ縦スクロールLP + ファウンダー/商品ページ + カート/Stripe決済。

## スタック

- **Astro 5**（SSG + islands・vanilla TS）+ **@astrojs/cloudflare**（API 2本のみ serverless）
- **GSAP 3.13 + ScrollTrigger + Lenis**（モーション層・LCP後 dynamic import）
- **nanostores**（カート・localStorage永続）/ **Stripe Checkout**（hosted・テストモード）
- **i18n**: fr（主）/ en / ja — パスプレフィックス + hreflang 完全クラスタ
- データ: フラットファイル（Content Collections + zod）— 更新手順は [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md)

## コマンド

```bash
pnpm install
pnpm dev          # 開発サーバー
pnpm build        # 全ページ静的生成（188ページ）
pnpm check        # astro check（型）
pnpm test         # ユニットテスト
node scripts/validate-content.mjs  # コンテンツ整合検証
```

## 主要ドキュメント

| ファイル | 内容 |
|---|---|
| [DESIGN.md](DESIGN.md) | ブランド契約（material world・トークン・モーション人格・anti-slopゲート）— 全ビジュアル判断の正本 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | アーキテクチャ決定記録（ADR） |
| [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md) | ファウンダー/商品の追加・削除手順 |
| [docs/LEGAL-OPEN-QUESTIONS.md](docs/LEGAL-OPEN-QUESTIONS.md) | 依頼者・専門家への確認事項（VAT/IOSS・配送・返品等） |

## 現状（MVP）と本番までの残作業

MVP はコード描画の和ビジュアル（SVG波景・プロシージャルcanvas・和柄）で全機能を実装済み。本番化には:
1. **実素材**: PD美術館アーカイブ調達 + AI生成 + I2Vヒーロー動画（`src/lib/assets.ts` の差し替え契約で投入）
2. **実データ**: 15ファウンダーの実プロフィール・商品・3言語翻訳
3. **Stripe本番**: Product/Price 登録・webhook 設定・VAT/IOSS 判断後に automatic_tax 有効化
4. **法務確定**: 法定5ページの [PLACEHOLDER] を弁護士確認済み本文で置換
5. **フォント**: 自己ホストのサブセット済み Web フォント導入（現在はシステムスタック）

<!-- skills-reference-rule:v2 (managed by Skills 工房 — 自動付与・このマーカーは編集しない) -->
## Skills 工房を継続参照

このリポジトリの開発セッションには **Skills 工房**（再利用可能スキル集）がスコープに含まれます。エージェントは制作の全工程で関連スキルを随時参照します。詳細・索引は Skills 工房の `_reference/skills-index.json` と各 `.claude/skills/<skill>/SKILL.md` を参照。
<!-- /skills-reference-rule:v2 -->
