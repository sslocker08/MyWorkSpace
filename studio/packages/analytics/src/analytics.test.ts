import { beforeEach, describe, expect, it, vi } from "vitest";
import { Analytics, TrackingPlanError } from "./analytics";
import { InMemorySink } from "./sink";
import { extendPlan } from "./plan";

function make(over: Partial<ConstructorParameters<typeof Analytics>[0]> = {}) {
  const sink = new InMemorySink();
  let t = Date.parse("2026-06-21T00:00:00.000Z");
  const analytics = new Analytics({
    productId: "house",
    appVersion: "1.0.0",
    sink,
    sessionId: "sess-1",
    idGen: () => "fixed-id",
    clock: () => new Date(t++),
    ...over,
  });
  return { analytics, sink };
}

describe("Analytics", () => {
  let analytics: Analytics;
  let sink: InMemorySink;
  beforeEach(() => {
    ({ analytics, sink } = make());
  });

  it("records a valid event with envelope metadata", () => {
    analytics.track("cta_click", { id: "hero-primary" });
    expect(sink.events).toHaveLength(1);
    const e = sink.events[0];
    expect(e.name).toBe("cta_click");
    expect(e.productId).toBe("house");
    expect(e.sessionId).toBe("sess-1");
    expect(e.context.appVersion).toBe("1.0.0");
    expect(e.timestamp).toBe("2026-06-21T00:00:00.000Z");
  });

  it("page() emits a page_view with the path", () => {
    analytics.page("/pricing", { ref: "nav" });
    const [e] = sink.byName("page_view");
    expect(e.props).toEqual({ path: "/pricing", ref: "nav" });
  });

  it("attaches userId after identify()", () => {
    analytics.identify("user-7");
    analytics.track("signup_started");
    expect(sink.events[0].userId).toBe("user-7");
  });

  it("throws in strict mode on an unknown event", () => {
    expect(() => analytics.track("not_planned")).toThrow(TrackingPlanError);
    expect(sink.events).toHaveLength(0);
  });

  it("throws in strict mode when a required prop is missing", () => {
    expect(() => analytics.track("purchase_completed", { sku: "x" })).toThrow(
      /missing required prop "amount"/,
    );
  });

  it("in non-strict mode drops bad events and reports via onError", () => {
    const onError = vi.fn();
    const { analytics: a, sink: s } = make({ strict: false, onError });
    a.track("not_planned");
    expect(s.events).toHaveLength(0);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(TrackingPlanError);
  });

  it("honors an extended plan with product-specific events", () => {
    const { analytics: a, sink: s } = make({
      plan: extendPlan({ unfold_exported: { required: ["format"] } }),
    });
    a.track("unfold_exported", { format: "pdf" });
    a.track("page_view", { path: "/" }); // canon still present
    expect(s.events.map((e) => e.name)).toEqual(["unfold_exported", "page_view"]);
  });
});
