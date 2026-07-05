# JP2FR — DESIGN.md（ブランド契約・全ビジュアル判断の正本）

> 全実装ワーカーはこのファイルに従う。ここに無い視覚判断は発明せず、トークンと規範から導出する。
> 対象: 日本の個人製作プロダクト（工芸・イラスト・衣類）をフランスへ届ける越境ECサイト。

## 0. Material World 宣言（唯一・不変）

**「木版画（浮世絵）× 和紙」** — 全ページ・全UI・全画像処理はこの一つの物質世界に属する。
- 画面は「刷り物」である: 紙地（生成り）の上に、限定インク（藍・墨・朱）を版で重ねた表現。
- デジタル的な光沢・ガラスモーフィズム・グラデーションボタン・ネオン発光は**世界の外＝禁止**。
- 影は「紙の浮き」: 多層の薄い影（§5）。光源は**左上に統一**（全要素共通）。

**マクロ構造宣言（anti-slop: テンプレ回避の指紋）**: LP は「**絵巻物（emaki）**」— 上から下へ読む一巻の巻物。セクション間の区切りは直線ボーダーではなく**霞（かすみ）の帯**（絵巻の場面転換の伝統技法・SVGで描く）。中央ヒーロー+3カラム特徴+CTAという頻出AIテンプレ構造を採らない。

## 1. Palette（OKLCH トークン・インラインhex禁止・tokens.css 経由のみ）

```css
/* 紙（地） */
--color-kinari:   oklch(0.955 0.012 95);   /* 生成り: 基調の紙地 */
--color-washi:    oklch(0.93 0.015 90);    /* 和紙: カード面 */
/* インク */
--color-sumi:     oklch(0.24 0.012 270);   /* 墨: 本文・見出し・暗幕 */
--color-sumi-usu: oklch(0.45 0.01 270);    /* 薄墨: 補助テキスト */
--color-ai:       oklch(0.40 0.095 255);   /* 藍: 主役。波・リンク・主要CTA */
--color-asagi:    oklch(0.63 0.075 230);   /* 浅葱: 藍の淡色・hover・波の中間調 */
--color-shu:      oklch(0.55 0.185 32);    /* 朱: 落款・強調・バッジ・カーソル。面積は全画面の5%未満 */
/* 定式幕（イントロ専用・本編では使わない） */
--color-moegi:    oklch(0.46 0.09 150);
--color-kaki:     oklch(0.60 0.14 48);
/* 意味論 */
--color-bg: var(--color-kinari);
--color-text: var(--color-sumi);
--color-accent: var(--color-ai);
--color-danger: var(--color-shu);
```
- 強調の序列: **藍ベタ面＋生成り抜き文字（最重要1要素のみ）→ 浅葱淡面 → 紙地＋墨罫線 → 藍文字 → 墨太字**。色数を増やさず濃淡と塗り面積で階層化。
- ダーク面（フッター・イントロ幕）= 墨地に生成り文字。コントラストは全て WCAG AA 以上。

## 2. Typography

- **見出し: 明朝（セリフ）系** / **本文: 同系統**。MVP はシステムスタック自己完結（外部フォントCDN禁止＝GDPR）:
  - `--font-display: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Georgia", serif;`
  - `--font-body: 同上`（和欧混植の統一感優先）・`--font-mono: ui-monospace, monospace`（価格・型番）
  - 本番は自己ホストのサブセット済み Web フォント（例: しっぽり明朝 / Noto Serif JP self-host + 欧文 serif）に差し替え（`public/fonts/`・ライセンス確認後）。
- **display 見出しにイタリック禁止**（AI-tell）。ヒーロー見出しは**7語以内/50字以内**・roman。
- 縦書き（`writing-mode: vertical-rl`）は**署名的アクセントとして限定使用**（セクション題字・落款）。本文には使わない。
- スケール: `--text-xs:0.75rem --text-sm:0.875rem --text-base:1rem --text-lg:1.25rem --text-xl:1.75rem --text-2xl:2.5rem --text-hero:clamp(2.5rem,6vw,4.5rem)`。行間: 和文本文 1.9・欧文本文 1.65・見出し 1.2。

## 3. テクスチャ・質感（texture-depth-tactile-craft 準拠）

- **和紙グレイン**: SVG `feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"` を全画面オーバーレイ。**opacity 3–5%・mix-blend-mode: soft-light**（10%超は禁止=安っぽい）。`public/textures/washi-grain.svg`。
- **版ズレ（見当ズレ）**: hover/署名箇所限定。藍・朱チャンネルを 1–2px オフセット（`filter` or 疑似要素）。木版の摺りの揺らぎ＝反AIシグナル。乱用禁止（ファウンダーカード hover と署名見出しのみ）。
- **多層影（紙の浮き）**: `--shadow-paper: 0 1px 2px oklch(0.24 0.012 270 / 0.06), 0 4px 8px oklch(0.24 0.012 270 / 0.06), 0 12px 24px oklch(0.24 0.012 270 / 0.05);` 単一の重い影は禁止。
- **罫線**: 1px 墨 20%。角丸は最大 2px（刷り物に大きい角丸は無い）。`--radius: 2px`。
- **和柄**: 青海波（seigaiha）= フッター/デバイダの線モチーフ。市松 = ローディング/プレースホルダ。**柄は線画SVGのみ**（塗り絵文字的な和柄ラスタは禁止）。

## 4. モーション人格（唯一・全編統一）

**「見得（mie）」— 溜めて、一気に決める。** 歌舞伎の緩急 = ease は out 系の急峻（`--ease-mie: cubic-bezier(0.16, 1, 0.3, 1)`）、duration は UI 150–400ms・場面転換のみ 450–600ms。**`ease-in` 単体は UI で禁止**。
- scrub 系は必ず `ease:'none'`。パララックス offset ≤1×。
- **ヒーロー/LCP要素に opacity:0 初期状態を絶対に付けない**。reveal は below-fold のみ。
- アニメ対象は `transform` / `opacity` のみ。width/height/top/left/box-shadow のアニメ禁止。
- `prefers-reduced-motion: reduce` で全演出停止（gsap.matchMedia）。イントロ即スキップ・シーケンスは最終フレーム静止。
- 署名マキシマリスト演出は **①波の canvas scrub ②ファウンダー横レール** の2箇所限定。他は抑制（restraint）。

## 5. コンポーネント規範

- **インタラクティブ要素は8状態を全て実装**: default / hover / :focus-visible / :active / disabled / loading / error / success。`:focus-visible` は朱 2px オフセットリング（コントラスト≥3:1）。
- ボタン: 主 = 藍ベタ＋生成り文字。副 = 紙地＋墨罫線。角丸 2px。hover は色を明るくするのでなく**版ズレ+浅葱へのシフト**。
- 画像グリッドは `grid-template-columns: repeat(auto-fill, minmax(0, 1fr))` 系（素の `1fr` 直書き不可）・全メディアに width/height（CLS=0）。
- モバイル 320/375/414/768px で1カラム・横スクロール無し（root `overflow-x: clip`）＝非妥協。
- 空/エラー/ローディング状態はハッピーパスより先に設計（empty カートは「空の風呂敷」イラスト等、世界観内で）。

## 6. 正直さ（anti-slop 必須ゲート）

- **メトリクス捏造禁止**（"50,000+ clients" 等を実データ無しに書かない）。偽証言・偽レビュー・偽ブラウザ枠禁止。
- プレースホルダ文言は `[PLACEHOLDER: 実データ待ち]` と明示（本物らしく偽装しない）。
- eyebrow（`01 / FEATURES` 型）を無条件に使わない。使う場合は絵巻の「詞書（ことばがき）」として和の意匠に統合。

## 7. 検収スタンプ（各ワーカー→Fable 関所）

実装完了時、担当ファイル冒頭コメントに 6軸自己採点を残す: `<!-- critique: P_ H_ E_ S_ R_ V_ -->`（Philosophy/Hierarchy/Execution/Specificity/Restraint/Variety、1–5、3未満は自分で直してから提出）。最終ゲートは「プロのデザイナーがこのまま出すか？」。

## 8. アセット差し替え契約（MVP→本番）

MVP はコード描画（SVG波・パターン・プロシージャルcanvas）。本番素材（PD浮世絵・AI生成・I2V動画）は同じファイルパス/コンポーネントpropで**差し替えのみ**で入るよう、素材参照は必ず定数/データ経由にする（ハードコード分散禁止）: `src/lib/assets.ts` に集約。

## 9. 出典
- Skills工房: frontend-design / anti-ai-slop-ui-design / texture-depth-tactile-craft / art-direction-imagery / web-motion-animation / color-systems（2026-07-05 調査）
