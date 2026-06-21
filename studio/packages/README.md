# packages/ — 6エンジン ＋ 共有層

各製品は **エンジン（共通実装）＋ 共有層** の上の薄い「ドメイン皮」。エンジンを1回作れば製品は数日〜数週で量産できる。

## 6エンジン
| パッケージ | 役割 | 主Skills（着手時に最新確認） |
|---|---|---|
| `engine-fab` | 製作/幾何アンフォールド：3D→2D型紙展開・厚み/シーム/カーフ・ネスティング・タイル印刷・原価 | `web-3d-engines` `react-three-fiber` `graphics-game-math-foundations` `dcc-uv-and-baking` `dcc-topology-retopology` |
| `engine-audio` | Web Audio/AudioWorklet・WASM DSP・微分音/再生・楽譜/タブ・ライブラリ | `web-ui-sound-design` `browser-platform-apis-engineering` `browser-wasm-and-on-device-ai` |
| `engine-sim` | デジタルツイン・Monte-Carlo・化学/物理モデル・合成データ・診断 | `simulation-driven-concept-validation` `robust-by-construction-design` `data-visualization` |
| `engine-viz` | 対話型3D解説・科学可視化・注釈・スクロールテリング・埋込配信 | `web-3d-engines` `scientific-molecular-web-viz` `web-motion-animation` `knowledge-encyclopedia-site-design` |
| `engine-ops` | B2Bモバイル現場業務・オフライン同期・見積/帳票・コンプラ記録・写真/GPS | `app-implementation` `native-device-experiences` `api-backend-architecture` `database-engineering` |
| `engine-web` | 物語/創作Web・ノードグラフ編集・ホスティング・利用/読者分析・コラボ・版管理 | `web-rendering-framework-architecture` `client-state-data-layer` `cms-admin-architecture` `web-analytics-measurement` |

## 共有層
| パッケージ | 役割 |
|---|---|
| `ui` | デザインシステム（製品ごと `DESIGN.md` 差替・8状態・反AI見え）＋共有ウィジェット（feedbackボタン等） |
| `auth` | 認証/認可（OAuth/OIDC・JWTvsセッション・RBAC） |
| `payments` | Stripe(サブ)＋Lemon Squeezy/Paddle(買い切り・MoR)＋IAP |
| `feedback` | **全製品にツール内蔵の機能追加リクエストUI**（→ [../docs/HUMAN-VS-AI.md](../docs/HUMAN-VS-AI.md)） |
| `analytics` | 計測/トラッキングプラン・KPI |
| `marketing` | LPテンプレ→製品別生成・SEO/構造化・ハウスサイト |

> 現状は Wave 0 骨格。各パッケージは着手時に Skills 最新を参照して実装する。
