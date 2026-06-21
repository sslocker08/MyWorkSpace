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

/**
 * Fire a page_view whenever `path` changes. Guarding on the last reported path
 * (not a one-time boolean) makes it both StrictMode-safe (no duplicate for the
 * same path) and correct for client-side navigation in a persistent layout
 * (each new path emits).
 */
export function usePageView(path: string, props?: EventProps): void {
  const analytics = useAnalytics();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === path) return;
    lastPath.current = path;
    analytics.page(path, props);
    // emit on path change; analytics is stable, props read at emit time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
}
