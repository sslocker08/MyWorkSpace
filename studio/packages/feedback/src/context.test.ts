import { describe, expect, it } from "vitest";
import { captureContext } from "./context";

describe("captureContext", () => {
  it("reads the current url from window.location (jsdom)", () => {
    const ctx = captureContext("2.1.0");
    expect(ctx.url).toMatch(/^https?:\/\//);
    expect(ctx.appVersion).toBe("2.1.0");
    expect(ctx.featureId).toBeUndefined();
  });

  it("includes featureId when provided", () => {
    const ctx = captureContext("2.1.0", "editor.unfold");
    expect(ctx.featureId).toBe("editor.unfold");
  });
});
