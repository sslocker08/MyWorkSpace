# @mwstudio/analytics

全製品が共有する**ガバナンス付き・型付き計測基盤**。`product-data-engineering` の「トラッキングプラン正本」に従い、イベントは**プランで宣言**され、クライアントが必須プロップを検証する（場当たり計測を防ぐ）。

## 2つのエントリ
| import | 中身 | 依存 |
|---|---|---|
| `@mwstudio/analytics` | コア（`Analytics`・プラン・sink） | なし |
| `@mwstudio/analytics/react` | `AnalyticsProvider` / `useAnalytics` / `usePageView` | `react`（peer） |

## 使い方
```ts
import { Analytics, ConsoleSink, extendPlan } from "@mwstudio/analytics";

const analytics = new Analytics({
  productId: "cosplay-cad",
  appVersion: "1.0.0",
  sink: new ConsoleSink(),
  plan: extendPlan({ unfold_exported: { required: ["format"] } }), // 製品固有イベントを追加
});

analytics.page("/editor");
analytics.track("unfold_exported", { format: "pdf" });
analytics.identify("user-123");
```
```tsx
import { AnalyticsProvider, usePageView, useAnalytics } from "@mwstudio/analytics/react";

<AnalyticsProvider analytics={analytics}><App/></AnalyticsProvider>;
// 画面で：
usePageView("/pricing");
const a = useAnalytics();
<button onClick={() => a.track("cta_click", { id: "buy" })}>購入</button>;
```

## 設計
- **トラッキングプラン正本** `studioPlan`（page_view / cta_click / signup_* / checkout_* / purchase_completed / feedback_*）。`extendPlan()` で製品固有イベントを合流。
- **検証**: 未宣言イベント・必須プロップ欠落は **strict（既定）で例外**、非strictでは**ドロップ＋`onError`通報**（本番はイベント不備でクラッシュしない）。
- **sink 抽象**: `InMemorySink`（テスト）/ `ConsoleSink`（開発）/ `NoopSink` / `MultiSink`。本番は CDP/ウェアハウスへPOSTするsinkを実装して差し替え。
- イベントは `productId`・`sessionId`・`timestamp`・`context`（url/referrer/appVersion）・任意 `userId` で封筒化。

## 開発
```bash
pnpm --filter @mwstudio/analytics build      # tsup → dist（ESM+型）
pnpm --filter @mwstudio/analytics typecheck
pnpm --filter @mwstudio/analytics test       # vitest（11 tests）
```
house アプリが本パッケージを利用（page_view / cta_click / feedback_submitted）。

## 次の段
本番 sink（server-side measurement・Consent Mode・click-ID dedup → `marketing-measurement-identity-plumbing`）、属性化（`attribution-and-incrementality-modeling`）、KPIダッシュボード。
