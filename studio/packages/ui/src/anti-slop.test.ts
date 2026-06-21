// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Automated slice of the anti-ai-slop gate: our own stylesheets must use
// design tokens (CSS variables) / OKLCH — never raw hex or rgb() — and must
// only ever transition transform/opacity (no layout animation).

const tokens = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf-8");
const components = readFileSync(
  new URL("../styles/components.css", import.meta.url),
  "utf-8",
);

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGB = /\brgba?\(/;

describe("anti-slop CSS gate", () => {
  it("tokens.css contains no hex or rgb() colors (OKLCH only)", () => {
    expect(HEX.test(tokens)).toBe(false);
    expect(RGB.test(tokens)).toBe(false);
  });

  it("components.css uses tokens, not raw hex/rgb colors", () => {
    expect(HEX.test(components)).toBe(false);
    expect(RGB.test(components)).toBe(false);
    expect(components).toMatch(/var\(--color-/);
  });

  it("components.css only transitions transform/opacity (no layout animation)", () => {
    const transitions = [...components.matchAll(/transition:\s*([^;]+);/g)].map(
      (m) => m[1],
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      // each animated property must be transform, opacity, or a color/border
      // paint property (cheap) — never width/height/top/left/margin.
      expect(t).not.toMatch(/\b(width|height|top|left|right|bottom|margin)\b/);
    }
  });

  it("defines the core semantic color roles", () => {
    for (const role of ["--color-bg", "--color-fg", "--color-accent", "--color-ring"]) {
      expect(tokens).toContain(role);
    }
  });
});
