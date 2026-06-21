import { describe, expect, it } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { Analytics } from "./analytics";
import { InMemorySink } from "./sink";
import { AnalyticsProvider, useAnalytics, usePageView } from "./react";
import type { ReactNode } from "react";

function setup() {
  const sink = new InMemorySink();
  const analytics = new Analytics({
    productId: "house",
    appVersion: "1.0.0",
    sink,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
  );
  return { sink, analytics, wrapper };
}

describe("analytics/react", () => {
  it("useAnalytics throws without a provider", () => {
    expect(() => renderHook(() => useAnalytics())).toThrow(
      /within an <AnalyticsProvider>/,
    );
  });

  it("useAnalytics returns the instance inside a provider", () => {
    const { analytics, wrapper } = setup();
    const { result } = renderHook(() => useAnalytics(), { wrapper });
    expect(result.current).toBe(analytics);
  });

  it("usePageView fires exactly one page_view on mount", () => {
    const { sink, wrapper } = setup();
    renderHook(() => usePageView("/home", { ref: "direct" }), { wrapper });
    expect(sink.byName("page_view")).toHaveLength(1);
    expect(sink.byName("page_view")[0].props).toEqual({
      path: "/home",
      ref: "direct",
    });
  });

  it("usePageView emits on path change but not for the same path", () => {
    const { sink, wrapper } = setup();
    const { rerender } = renderHook(({ p }) => usePageView(p), {
      wrapper,
      initialProps: { p: "/a" },
    });
    rerender({ p: "/a" }); // same path → no new event
    rerender({ p: "/b" }); // navigation → new event
    expect(sink.byName("page_view").map((e) => e.props.path)).toEqual(["/a", "/b"]);
  });

  it("a component can track via the hook", () => {
    const { sink, analytics } = setup();
    function Cta() {
      const a = useAnalytics();
      return (
        <button onClick={() => a.track("cta_click", { id: "buy" })}>buy</button>
      );
    }
    render(
      <AnalyticsProvider analytics={analytics}>
        <Cta />
      </AnalyticsProvider>,
    );
    screen.getByText("buy").click();
    expect(sink.byName("cta_click")[0].props).toEqual({ id: "buy" });
  });
});
