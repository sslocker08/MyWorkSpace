# LP v2 アートディレクション仕様（Fable直筆 — W4/W5 実装者向け）

> リファレンス: ユーザー提供カンプ。DESIGN.md v2 が上位規範。トークン名は tokens.css の通り。

## §1 イントロアニメーション（data-intro 全画面・紺墨）

**構図（デスクトップ）**: 紺墨（--color-kon）全画面。
- **左40%: 大首絵** `/img/intro/actor.webp` — 高さ100vh・幅40vw を `object-fit: cover` で覆い、**右エッジと下エッジを mask-image で闇に溶かす**: `mask-image: linear-gradient(to right, black 55%, transparent 96%), linear-gradient(to top, black 70%, transparent 100%); mask-composite: intersect;`（直線の切れ目を絶対に見せない）。モバイルは高さ45vh・上部配置。
- **右上: 朱の日輪** — 直径 clamp(120px, 18vw, 260px) の `--color-shu` 円（CSS円・版ズレ風に金の細輪 1px オフセット可）。
- **中央〜右55%: 文字ブロック**（生成り on 紺墨）:
  - 「JP2FR」 Cormorant 700・`clamp(4.5rem, 11vw, 9.5rem)`・letter-spacing 0.02em
  - 直下: 「DU JAPON, AVEC PASSION, JUSQU'EN FRANCE.」（i18n lp.intro.message を使用。既存キー）— Noto Sans 500・letter-spacing 0.18em・text-transform uppercase・--on-dark-dim
  - 下部中央: lp.hero.scroll（Scroller pour découvrir）+ 縦線
- スキップボタン既存位置（右下・生成り枠線ボタン）。
- **金の割線**: 文字ブロック左に 1px --color-kin の縦罫（高さ ~40%）。金はこの罫と日輪の輪のみ＝fill/罫限定則。

## §2 ヒーロー（data-hero フルブリード）

- 背景: `/media/hero/bridge-dark-1200.webp` (srcset 2000w) を **100svh フルブリード** `object-fit: cover; object-position: center 40%`。data-parallax="0.25" 維持。将来videoスワップ口（heroAssets）維持。
- **スクリム**: `linear-gradient(to top, oklch(0.17 0.03 264 / 0.82), oklch(0.17 0.03 264 / 0.25) 45%, transparent 70%)` を全面 + 左下に追加の radial 暗み。
- **文字ブロック: 左下配置**（カンプ準拠）。container padding 内・max-width 34rem:
  - h1 `L'art du Japon, chez vous.`（i18n lp.hero.title を v2 文言に更新 — W4 が3言語分 i18n を更新してよい: fr «L'art du Japon, chez vous.» / en "The art of Japan, at home." / ja「日本の芸を、あなたの元へ。」）Cormorant 600・`clamp(2.8rem, 5.5vw, 4.8rem)`・--on-dark・**初期完全可視（LCP）**
  - サブ: 既存 lp.hero.subtitle・--on-dark-dim
  - **CTA: 朱ベタ「Découvrir les produits」**（i18n lp2.hero_cta）→ /{L}/products/。`.btn` 基準だが背景 --color-shu・文字 --color-kinari・padding大きめ（1rem 2rem）・uppercase・letter-spacing 0.08em。hoverは明度+2%でなく**金1px外枠が浮く**。
- 右端: 縦書き帯（既存 .hero-tategaki 技法を暗地対応: 地=透明・文字=--on-dark・罫=--on-dark 22%）。文言「日本の手仕事」維持。
- 下端: scroll-cue（--on-dark-dim）。
- 出典キャプション chip 維持（広重《日本橋》· The Met (CC0)・暗地対応: 背景 oklch(0.17 0.03 264/0.85)・文字 --on-dark-dim・朱の left-border 維持）。

## §3 コンセプト（生成り・明ゾーン）

- 従来トーン維持。見出しを Cormorant イタリック禁止・大きく（--text-2xl 超え可）。
- **4特徴アイコン行**: 2×2（モバイル）/4列（デスクトップ）。各項目 = 線画アイコン（下記）+ 題（lp2.concept_featN_t・墨・Noto Sans 600）+ 副（lp2.concept_featN_b・薄墨）。
- **アイコンは統一線画セット（新規SVG 4点・W4が描く）**: stroke=currentColor・stroke-width 1.5・viewBox 24・fill none。①判子/落款（Authentique）②扇（Sélectionné）③帆掛け舟（Livraison）④錠前に組紐（Paiement）。**絵文字風・塗り絵風禁止**。
- 背景に既存 kasumi.svg を極薄で1枚（opacity 0.5以下）。

## §4-7 ダークゾーン共通（W5向け）

- セクション地 = --surface-dark。カード = --surface-dark-raised・罫 1px oklch(0.955 0.012 95 / 0.12)・hover = --surface-dark-high + **生成り/金の版ズレ**（DESIGN.md §3 v2）。
- kicker（詞書）は暗地では --color-kin **可**（大型・大文字・letter-spacing 0.14em — 金は罫/大型限定則の「大型」扱い。ただし本文サイズ禁止）。
- ファウンダーカルーセル: `portrait-duo.webp`（藍デュオトーン）使用・カード下部に名前（--on-dark・Cormorant）+ 職種（--on-dark-dim）。矢印ボタン=円形 44px・生成り枠線・8状態。
- カテゴリカード5枚: 各カテゴリ代表商品画像（products JSON から category 毎に order 最小の1点）を上60%・下40%に **カテゴリ名帯**（--surface-dark-raised・uppercase・--on-dark）。全体 grid minmax(min(100%,14rem),1fr)。
- SNS: 鳥居線画SVG（stroke --color-shu・大型・中央）+ アイコン行（IG/TikTok/YouTube/X/Pinterest — 統一線画・--on-dark-dim・hover --on-dark。**inert（span）**: 実URLが無いものをリンクにしない）。
- フッター: 4カラム（BOUTIQUE=founders/products/cart ／ AIDE=cgv/cookies/contact予定 ／ À PROPOS=concept anchor ／ LÉGAL=既存法定5リンク）+ 最下段: © 行 + **決済チップ**（"Stripe" "Visa" "Mastercard" "Apple Pay" — 枠線チップ・--on-dark-dim・ロゴ画像は使わない）。

## 禁止事項の再掲

- ヒーローh1/イントロ文字に opacity:0 初期状態禁止（動きはJSのfrom tweenのみ）
- 金を本文・小ラベルに使わない ／ 朱の面積は画面の5%未満（CTA・日輪・落款で予算内に）
- カンプ内の「© 2024」「search/userアイコン（機能なし）」「TikTok等の偽リンク化」は**コピーしない**（正直さゲート）
