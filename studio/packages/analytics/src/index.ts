// @mwstudio/analytics — framework-agnostic core ("." export).
// React provider/hooks live at "@mwstudio/analytics/react".
export type * from "./types";
export { Analytics, TrackingPlanError, type AnalyticsOptions } from "./analytics";
export { studioPlan, extendPlan, type StudioEventName } from "./plan";
export { InMemorySink, NoopSink, ConsoleSink, MultiSink } from "./sink";
