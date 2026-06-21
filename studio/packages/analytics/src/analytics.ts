import type {
  AnalyticsEvent,
  AnalyticsSink,
  EventContext,
  EventProps,
  TrackingPlan,
} from "./types";
import { studioPlan } from "./plan";
import { NoopSink } from "./sink";

export class TrackingPlanError extends Error {
  constructor(
    message: string,
    readonly eventName: string,
  ) {
    super(message);
    this.name = "TrackingPlanError";
  }
}

export interface AnalyticsOptions {
  productId: string;
  appVersion: string;
  sink?: AnalyticsSink;
  /** Governed event allow-list. Defaults to the Studio canon. */
  plan?: TrackingPlan;
  /** In strict mode (default) plan violations throw; otherwise they are dropped
   *  and reported via onError, so production never crashes on a bad event. */
  strict?: boolean;
  onError?: (err: TrackingPlanError) => void;
  /** Overridable for deterministic tests. */
  idGen?: () => string;
  clock?: () => Date;
  sessionId?: string;
}

function defaultId(): string {
  return globalThis.crypto.randomUUID();
}

function readContext(appVersion: string): EventContext {
  if (typeof window !== "undefined" && window.location) {
    return {
      appVersion,
      url: window.location.href,
      referrer: document.referrer || undefined,
    };
  }
  return { appVersion };
}

/**
 * Typed analytics client. Validates every event against the tracking plan,
 * stamps it with session/timestamp/context, and forwards to a sink.
 */
export class Analytics {
  private readonly productId: string;
  private readonly appVersion: string;
  private readonly sink: AnalyticsSink;
  private readonly plan: TrackingPlan;
  private readonly strict: boolean;
  private readonly onError?: (err: TrackingPlanError) => void;
  private readonly idGen: () => string;
  private readonly clock: () => Date;
  private readonly sessionId: string;
  private userId?: string;

  constructor(opts: AnalyticsOptions) {
    this.productId = opts.productId;
    this.appVersion = opts.appVersion;
    this.sink = opts.sink ?? new NoopSink();
    this.plan = opts.plan ?? studioPlan;
    this.strict = opts.strict ?? true;
    this.onError = opts.onError;
    this.idGen = opts.idGen ?? defaultId;
    this.clock = opts.clock ?? (() => new Date());
    this.sessionId = opts.sessionId ?? this.idGen();
  }

  identify(userId: string): void {
    this.userId = userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /** Validate against the plan, assemble the envelope, forward to the sink. */
  track(name: string, props: EventProps = {}): void {
    const err = this.validate(name, props);
    if (err) {
      if (this.strict) throw err;
      this.onError?.(err);
      return;
    }
    const event: AnalyticsEvent = {
      name,
      productId: this.productId,
      props,
      sessionId: this.sessionId,
      timestamp: this.clock().toISOString(),
      context: readContext(this.appVersion),
      ...(this.userId ? { userId: this.userId } : {}),
    };
    void this.sink.record(event);
  }

  /** Convenience for the page_view canon event. */
  page(path: string, props: EventProps = {}): void {
    this.track("page_view", { path, ...props });
  }

  private validate(name: string, props: EventProps): TrackingPlanError | null {
    const spec = this.plan[name];
    if (!spec) {
      return new TrackingPlanError(
        `event "${name}" is not in the tracking plan`,
        name,
      );
    }
    for (const key of spec.required ?? []) {
      if (props[key] === undefined || props[key] === null) {
        return new TrackingPlanError(
          `event "${name}" is missing required prop "${key}"`,
          name,
        );
      }
    }
    return null;
  }
}
