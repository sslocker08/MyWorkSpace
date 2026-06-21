// @mwstudio/analytics/react — provider + hooks.
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Analytics } from "./analytics";
import type { EventProps } from "./types";

const AnalyticsContext = createContext<Analytics | null>(null);

export function AnalyticsProvider({
  analytics,
  children,
}: {
  analytics: Analytics;
  children: ReactNode;
}) {
  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/** Access the Analytics instance. Throws if no provider is mounted. */
export function useAnalytics(): Analytics {
  const a = useContext(AnalyticsContext);
  if (!a) {
    throw new Error("useAnalytics must be used within an <AnalyticsProvider>");
  }
  return a;
}

/** Fire a page_view exactly once on mount (StrictMode double-invoke safe). */
export function usePageView(path: string, props?: EventProps): void {
  const analytics = useAnalytics();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    analytics.page(path, props);
    // intentionally run once per mounted path
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
}
