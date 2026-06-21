# @mwstudio/feedback

全Studio製品が標準搭載する**ツール内**機能リクエスト／フィードバック基盤（メールではなくアプリ内・投票可・画面コンテキスト自動添付・ビルドパイプライン連携）。設計背景は [../../docs/HUMAN-VS-AI.md](../../docs/HUMAN-VS-AI.md)。

## 2つのエントリ
| import | 中身 | 依存 |
|---|---|---|
| `@mwstudio/feedback` | フレームワーク非依存コア（型・client・store・validation・spec） | なし（Node/ブラウザ両対応） |
| `@mwstudio/feedback/widget` | React ウィジェット `FeedbackWidget`（ボタン→モーダル→送信） | `react`（peer） |

## コア API
- `DefaultFeedbackClient`（`FeedbackClient` 実装。`store`/`idGen`/`clock` を注入可＝テスト容易）
  - `submit(NewFeedback)` 検証→id/status=`new`/votes=0/timestamps 付与（body trim）
  - `list(productId)` 公開ロードマップ順（得票降順→新着）
  - `vote(id)` 加点＋`updatedAt`更新
  - `updateStatus(id, status)` ライフサイクル前進（`new→triaged→planned→in_progress→shipped`、任意の開状態から`declined`）。後退・終端変更は例外。`shipped`到達時に`shippedAt`記録
  - `getMetrics(productId?)` 件数・総得票・状態別・**平均リードタイム（new→shipped, 日）**
- `FeedbackStore` 永続化抽象＋`InMemoryFeedbackStore`（本番は cms-admin + DB が同IFを実装）
- `captureContext(appVersion, featureId?)` 画面URL等を自動取得（非DOMは`unknown`へフォールバック）
- `validateNewFeedback` / `FeedbackValidationError`
- `toSpecStub(item)` / `renderSpecMarkdown(item)` … リクエストを build-orchestrator の Phase-1 spec雛形に変換（「すぐ反映」を構造で担保）

## React ウィジェット
```tsx
import { FeedbackWidget } from "@mwstudio/feedback/widget";

<FeedbackWidget
  client={client}            // FeedbackClient
  productId="cosplay-cad"
  appVersion="1.0.0"
  featureId="editor"         // 任意：現在画面
  userId={user?.id}          // 任意
  onSubmitted={(id) => {/* ロードマップ再取得など */}}
/>
```
クラス名（`mwfeedback__*`）でスキン可能。配色/書体は各製品の `packages/ui`（`DESIGN.md`）で当てる。

## 開発
```bash
pnpm --filter @mwstudio/feedback build       # tsup → dist (ESM + d.ts)
pnpm --filter @mwstudio/feedback typecheck   # tsc --noEmit
pnpm --filter @mwstudio/feedback test        # vitest (22 tests)
```

## 未実装（次の段）
バックエンド `FeedbackStore`（cms-admin + DB）、トリアージ盤UI、投票の重複防止（userId単位）、スクショアップロード、KPIダッシュボード連携（`web-analytics-measurement`）。
