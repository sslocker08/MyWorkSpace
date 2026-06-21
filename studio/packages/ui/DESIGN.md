---
name: studio-default
version: 0.1.0
updated: 2026-06-21
---

# DESIGN.md — Studio 既定ブランド契約

`brand-guidelines` の「DESIGN.md パターン」に従う9セクションの機械可読契約。各製品はこれを複製し、ターゲットの中心を撃ち抜く値（原則⑤）に再調整する。機械可読版は `src/design-contract.ts` の `studioDesign`。

## 1. Palette
- 方式: **OKLCH のみ**（hex/rgb禁止）。プリミティブ ramp（`--brand-*`/`--neutral-*`）→ セマンティック（`--color-*`）の2層。
- 振り幅の起点: `--brand-h`（色相 264）/ `--brand-c`（彩度 0.13）。製品はここを振るだけで全体が変わる。
- セマンティック: `--color-bg/-subtle/-muted` `--color-surface` `--color-fg/-muted` `--color-border/-strong` `--color-accent/-hover/-fg` `--color-ring` `--color-success/-warning/-error/-info`。
- コントラスト監査（AA以上を実証）: fg/bg=14.8(AAA) / accent-fg/accent=6.1(AA) / fg-muted/bg=4.7(AA)。

## 2. Type
- Display: Inter（600/700・ローマンのみ＝イタリック見出し禁止）。
- Body: Inter（400/500/600・line-height 1.6・measure 65ch）。
- Mono: ui-monospace。
- スケール: base 1rem・比率 1.25（`--step--1`…`--step-5`）。

## 3. Spacing
- 基準: 4px グリッド。`--space-1`(4) … `--space-24`(96)。

## 4. Layout & Rhythm
- ブレークポイント: mobile 375 / tablet 768 / desktop 1024 / wide 1440。
- グリッド: 12カラム。コンテナ最大 1200px。

## 5. Components
- v1: Button / Input（**全8状態**）、Badge / Card。
- 規約: `forwardRef`、複合API（`Card.Header/Body/Footer`）、トークンのみ、クラスは `mwui-*`。

## 6. Motion
- duration: micro 150ms / standard 250ms / reveal 600ms。easing: standard `cubic-bezier(.4,0,.2,1)` / out `cubic-bezier(0,0,.2,1)`。
- **transform / opacity のみアニメ**（レイアウトアニメ禁止）。`prefers-reduced-motion` で無効化。

## 7. Voice & Tone
- 人格: direct / clear / human / not corporate。
- 規則: sentence case・能動態・**fake metrics禁止**・マーケ用語回避（`anti-ai-prose` と整合）。

## 8. Brand
- ミッション: AIの力で最高品質のニッチ・プロダクトを量産する。
- a11y フロア: コントラスト AA・タップ領域 48px・`prefers-reduced-motion` 尊重。

## 9. Anti-Patterns（やらない）
- 純黒#000/純白#fff背景（near-black/near-white の OKLCH を使う）
- イタリック見出し
- インライン hex/rgb・font-family 直書き（CSS変数のみ）
- レイアウトアニメ（transform/opacity のみ）
- 画像グリッドの素の `1fr`（`minmax(0,1fr)` を使う）
- インタラクティブ要素で8状態未満
- fake metrics / 偽ブラウザクローム / 捏造テストモニアル
