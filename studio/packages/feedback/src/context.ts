import type { FeedbackContext } from "./types";

/**
 * Capture the current screen context so the user doesn't have to describe where
 * they are. Reads `window.location` in the browser; falls back gracefully in
 * non-DOM environments (SSR / tests / Node backends).
 */
export function captureContext(
  appVersion: string,
  featureId?: string,
): FeedbackContext {
  const url =
    typeof window !== "undefined" && window.location
      ? window.location.href
      : "unknown";
  return {
    url,
    appVersion,
    ...(featureId ? { featureId } : {}),
  };
}
