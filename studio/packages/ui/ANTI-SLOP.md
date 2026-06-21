# 反・AIスロップ・ゲート（出荷前チェックリスト）

`anti-ai-slop-ui-design` スキル由来。UI/LP を出す前に全項目を満たす。**★ は `src/anti-slop.test.ts` / `src/design-contract.test.ts` で自動検証済み**。

## タイポグラフィ
- [ ] イタリック見出し禁止（イタリックは本文強調のみ）
- [ ] 素の番号見出し（01/02）は本物のステップ/年表のときだけ
- [ ] ヒーロー見出し ≤7語/≤50字（`overflow-wrap:anywhere; min-width:0`）

## 誠実さ
- [ ] fake metrics 禁止（"+47%" "50k社導入" 等の捏造）
- [ ] 偽ブラウザ/スマホ/IDE クローム禁止

## 技術・レイアウト
- [ ] ★ 色はすべて CSS変数（`var(--color-*)`）。inline hex/rgb/oklch 禁止
- [ ] フォントはすべて CSS変数（`var(--font-*)`）
- [ ] 余白はトークンスケール（`--space-*`）のみ。マジックナンバー禁止
- [ ] 画像グリッドは `minmax(0,1fr)`（素の `1fr` 禁止）
- [ ] 横スクロール無し（root `overflow-x: clip`）
- [ ] モバイル 320/375/414/768 検証・1カラム・はみ出し無し

## モーション
- [ ] ★ アニメは `transform`/`opacity` のみ（width/height/top/left 等のレイアウトアニメ禁止）
- [ ] `:focus-visible` リングは**即時**表示（コントラスト ≥3:1）
- [ ] `prefers-reduced-motion` 尊重（無効化＝即時クロスフェード/無し）

## コンポーネント
- [ ] ★ インタラクティブ要素は**全8状態**: default / hover / :focus-visible / :active / disabled / loading / error / success
- [ ] どれか欠けたら未出荷扱い

## アクセシビリティ（WCAG AA 最低限）
- [ ] テキストコントラスト ≥4.5:1（通常）/ ≥3:1（大）
- [ ] タップ領域 ≥48×48px
- [ ] フォーカス可視・色のみで意味を伝えない・フォームラベル・alt

## 検証コマンド
```bash
pnpm --filter @mwstudio/ui test     # トークン/8状態/モーションの自動ゲート
pnpm --filter @mwstudio/ui typecheck
# 次段: axe-core a11y 監査、320–1440px スクショ回帰
```
