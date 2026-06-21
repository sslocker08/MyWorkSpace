# ビジネスモデル・懐疑的P&L・販売/広告戦略

## 課金モデル方針（買い切り vs サブスク）
| パターン | 適用 | 根拠 |
|---|---|---|
| **買い切り(OT) $29–149＋任意マーケット** | FAB創作ツール、microtonal、handpan、conlang、quilting、narrative editor、puzzle-hunt | 創作系購買者はサブ抵抗が強く、incumbentが買い切り（Pepakura $38, EQ8 $200, Glyphs €299, Glass Eye $149）。LTVはマーケット手数料で底上げ |
| **サブスク(SUB)** | OPS全件、VIZのB2B、AUDクラウド（choir/foley）、WEBホスト（IF分析/worldbuilding/screenwriting/comic/escape/POD） | クラウド/AI/計算コストを継続負担、または継続価値（B2B業務・データ・分析）を提供 |
| **freemium+sub(FRE)** | 趣味系SIMトラッカー、教育VIZ | 無料で習慣化→シミュ/AI/機関ライセンスで課金 |
| **マーケット手数料(MKT)** | 型紙/アセット流通（cosplay/leather/embroidery/POD/sample/patch） | 最高レバレッジ。ツール＋市場で二重収益（「Xの Etsy」型） |
| **モバイルIAP** | 趣味トラッカー、farrier等現場アプリ | `in-app-purchase-subscriptions` / `mobile-onboarding-paywall-conversion` |

## コスト構造（販売予算だけでなく実装/運営継続費を織込む）
- **実装(初期)**: AIトークン費＋人間ヘルプ工数（人間必須ゲート分）。エンジン再利用で2波目以降は 1/5–1/10。
- **運営継続(月次)**: ホスティング/CDN、**AI推論従量**（生成/診断系）、DB/ストレージ、**決済手数料 ~2.9%+30¢**、**App Store/Play 15–30%**、Lemon Squeezy/Paddle(MoR) ~5%+、ドメイン/メール、監視、サポート、**法務/コンプラ更新**（B2B）。
- **販売/獲得(CAC)**: 広告費、コンテンツ制作、影響者シード、分析/メールツール。
- **隠れコスト**: 返金/チャージバック、サポート時間、マーケット・モデレーション、解約(churn)。

## 懐疑前提（保守的に置く）
無料→有料転換 **1–3%**（freemiumは更に低）、月次churn **5–8%**(消費者)/**2–3%**(B2B)、ニッチTAMは公称の**10–20%が現実到達**、買い切りは**リピート無し前提でLTV=単価×返金控除**。

## アーキタイプ別の現実P&L方針
| アーキタイプ | 推す課金 | 懐疑的見立て |
|---|---|---|
| FAB/創作（OT $39–149） | 買い切り＋型紙MKT手数料 | 低WTP・有料広告は回収困難 → **オーガニック/コミュニティ主導**。LTVは**マーケット手数料**で底上げ |
| AUDクラウド/SIM消費者（FRE/SUB $6–15/mo） | freemium+サブ | 転換1–3%・churn高 → 小TAMでは数十〜数百有料/製品が現実。**複数製品の合算**で運営費を割る（共有基盤が効く） |
| VIZ B2B / OPS B2B（SUB $99–499/mo） | サブ | 高LTV($1.2–6k/年)・churn低 → **有料検索/直販のCACが回収可能**。**ポートフォリオの利益エンジン** |
| マーケット（MKT 10–30%） | 流通手数料 | 供給（出品者）集めが律速 → 旗艦の既存コミュ(405th/Etsy越境)から種を入れる |

### ワークド例（保守シナリオ・月次・概算）
- **Arborist OPS(B2B SUB)**: ARPU $149 × 到達150社 = 売上 ~$22k。運営(ホスト+決済3%+サポート) ~$3k、CAC(検索広告 回収12ヶ月) → **粗利が立つ＝利益エンジン候補**。
- **Cosplay CAD(OT+MKT)**: ツール $49×到達300本/mo = $14.7k ＋ 型紙MKT GMV $30k×15% = $4.5k → ~$19k。広告ほぼ打たず YouTube/Reddit/405th で CAC≒0。運営は静的中心で低。
- **Reef sim(FRE $12/mo)**: 無料1万→転換2%=200有料=$2.4k/mo。AI/計算＋ホスト ~$0.6k。**単体薄利** → 共有基盤＋複数SIM製品で運営費按分して成立。
> 結論: **B2B(VIZ/OPS)が利益の柱、創作OT＋マーケットが旗、消費者SIM/AUDは束ねて薄利を積層**。各製品の着手前に本テンプレで個別P&Lを更新し、回収不能なら課金/チャネルを組替える。

## 販売プラットフォーム
- **自社サイト＋決済**: サブ=Stripe Billing、買い切り=**Lemon Squeezy/Paddle(MoR)**でVAT/請求代行。B2B=Stripe＋請求書。
- **クリエイティブOT/アセット**: Gumroad・itch.io、型紙/サンプルは **Etsy/Cults3D 越境出品**で発見性を借り自社マーケットへ誘導。
- **モバイル**: App Store/Play（OPS現場アプリ・趣味トラッカー）。
- **ハウスサイト**: 全製品束ね（クロスセル/共通アカウント）。

## 広告ターゲット媒体（アーキタイプ別・費用対効果込み）
| アーキタイプ | 主媒体 | 方針/ROI |
|---|---|---|
| FAB/創作・AUD・SIM(消費者) | Reddit/専門フォーラム(405th,RPF,Reef2Reef)、YouTube、TikTok/IG/Pinterest、Discord、itch | **コンテンツ/コミュニティ主導**。低単価で有料広告は回収難 → 影響者シード＋SEO＋デモ動画。少額テストのみ |
| WEB/Authoring | Reddit(r/rpg,r/worldbuilding,r/interactivefiction)、YouTube、Discord、itch | コミュニティ＋テンプレ/プログラマティックSEO |
| VIZ B2B / OPS B2B | **Google検索(高intent)**、LinkedIn、業界誌/協会(TCIA/ADCI/PTG)、展示会、コールドアウトリーチ | **有料検索＋直販が回収可能**(高LTV)。広告予算をここに集中 |

- **ビジュアル/動画生成（低コスト・内製）**: LPヒーロー・デモGIF・広告クリエイティブを `generative-image-prompt-craft`＋`art-direction-imagery`＋`faceless-video-automation`＋`prebuilt-animated-vector-components` で生成。撮影/外注費を圧縮。
- **費用対効果予測**: チャネル別 CAC/LTV を上記懐疑前提で算定。創作OTは**オーガニック必須**、B2Bは**LTV/CAC≥3**を出せる検索/直販に寄せる。`experimentation-cro`＋`web-analytics-measurement`＋`attribution-and-incrementality-modeling` で実測・最適化。
- **その他**: オンボーディング(`web-onboarding-activation`)、リテンション/解約防止(`retention-lifecycle`)、ToS/Privacy/DPA(`web-legal-compliance`)、サポート/ドキュメント、ツール内フィードバック由来の**公開ロードマップ**、i18n(後段)。
