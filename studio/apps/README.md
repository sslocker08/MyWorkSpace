# apps/ — 製品アプリ（1製品 = 1ディレクトリ）

各製品は対応エンジン＋共有層の上の「ドメイン皮」。命名は kebab-case。

## Wave 1 旗艦（各エンジン1本＝パイプライン実証）
| dir（予定） | エンジン | 製品 |
|---|---|---|
| `cosplay-cad/` | engine-fab | Cosplay foam-armor CAD |
| `choir-arranger/` | engine-audio | Choir / a cappella arranger |
| `reef-sim/` | engine-sim | Reef/planted aquarium 化学ツイン |
| `explainer3d/` | engine-viz | Vertical 3D 解説 SaaS（職種別） |
| `arborist-ops/` | engine-ops | Arborist 見積+3D診断 |
| `if-studio/` | engine-web | IF/Twine 後継＋読者分析 |

全製品の一覧・スコア・課金モデルは [../docs/PORTFOLIO.md](../docs/PORTFOLIO.md)。各製品は6フェーズ（要件→基本→詳細→実装→テスト→リリース、[../docs/ROADMAP.md](../docs/ROADMAP.md)）を通し、`feedback` ウィジェットを必ず内蔵する。
