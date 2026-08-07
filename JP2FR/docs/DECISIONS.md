# JP2FR — アーキテクチャ決定記録（ADR）

## ADR-1: Astro (SSG + islands) + vanilla TS（2026-07-05）
- **決定**: フレームワークは Astro 5・output static・API 2本のみ prerender=false。React 不採用（GSAP/Lenis はフレームワーク非依存、useGSAP ラッパーは不要な税）。
- **根拠**: 演出比重の高いLP + 軽量コマース（認証なし・サーバー在庫なし・Stripe Checkout hosted）。デフォルトJSゼロが LCP≤2.5s に直結。
- **棄却案**: Next.js App Router — 会員アカウント/注文履歴/サーバー在庫が確定要件になった時に再評価。

## ADR-2: Cloudflare Pages + Workers（@astrojs/cloudflare）
- egress 無料（動画・画像シーケンスの帯域が支配的）。Workers KV を webhook dedup に流用。
- **注意**: Workers 上の Stripe は `createFetchHttpClient()` + `constructEventAsync()` 必須（実装済み）。問題時は @astrojs/vercel へ差し替え可（endpoint コードほぼ無変更）。

## ADR-3: 決済は Stripe Checkout（hosted リダイレクト）
- PCI SAQ-A 最小スコープ。金額はサーバー解決（クライアント金額不信）。注文確定の正本は webhook（success_url は断定しない）。
- `automatic_tax` は **無効のまま**（VAT/IOSS 登録判断待ち → docs/LEGAL-OPEN-QUESTIONS.md #1）。
- 一点物の競合窓: session `expires_at` 30分 + 後着返金ポリシー（要クライアント合意）。

## ADR-4: データはフラットファイル（Content Collections + zod）
- 更新は開発者経由・低頻度 → Git-based が「手離れ」最良。JSON 追加/削除 + 再デプロイのみで運用。
- 15ファウンダー・36商品・i18n 3カタログ。整合は `scripts/validate-content.mjs`（CI）で担保。

## ADR-5: i18n はパスプレフィックス3ロケール（fr主/en/ja）
- `/fr/` `/en/` `/ja/`・hreflang 完全クラスタ（+x-default）。価格・日付は常に Intl（手整形禁止）。
- LP のみ実フォルダ（fr/en/ja/index.astro）、他は `[locale]` 動的ルート — LP はロケール毎に完全静的、他は getStaticPaths で3倍展開。

## ADR-6: MVP 素材はコード描画・差し替え契約で本番素材へ
- SVG手組みヒーロー波景・プロシージャルcanvas波・和柄SVG。素材参照は `src/lib/assets.ts` 集約（DESIGN.md §8）。
- 本番: PD美術館アーカイブ（Met CC0 / 国立美術館総合目録）調達 + AI生成補完 + I2V ヒーロー動画（計画 §6 Phase A–F、別セッション）。

## ADR-7: tsconfig は `.astro/types.d.ts` を include（2026-07-05 修正）
- 除外すると astro:content の zod 型が全ページで any に落ちる（check 44エラーの原因だった）。`include: [".astro/types.d.ts", "**/*"]` を維持すること。
