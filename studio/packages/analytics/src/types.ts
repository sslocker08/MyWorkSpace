// @mwstudio/analytics — governed, typed event model.
// "Tracking-plan canon" (product-data-engineering): events are declared in a
// plan with required props; the client validates against it so measurement is
// governed rather than ad-hoc.

export type EventProps = Record<string, string | number | boolean | null>;

export interface EventContext {
  url?: string;
  referrer?: string;
  appVersion: string;
}

/** A recorded event envelope, assembled by the client and handed to a sink. */
export interface AnalyticsEvent {
  name: string;
  productId: string;
  props: EventProps;
  userId?: string;
  sessionId: string;
  timestamp: string;
  context: EventContext;
}

/** Declares one event in the tracking plan. */
export interface EventSpec {
  description?: string;
  /** Prop keys that must be present (and non-null) when this event is tracked. */
  required?: string[];
}

/** event name → spec. The governed allow-list for a product. */
export type TrackingPlan = Record<string, EventSpec>;

/** Where validated events go. Real sinks POST to a CDP/warehouse; tests use memory. */
export interface AnalyticsSink {
  record(event: AnalyticsEvent): void | Promise<void>;
}
