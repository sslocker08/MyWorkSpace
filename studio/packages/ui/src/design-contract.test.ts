import { describe, expect, it } from "vitest";
import {
  REQUIRED_STATES,
  hasAllRequiredStates,
  studioDesign,
} from "./design-contract";

describe("design contract", () => {
  it("requires exactly the 8 interactive states", () => {
    expect(REQUIRED_STATES).toHaveLength(8);
  });

  it("interactive primitives (Button, Input) declare all 8 states", () => {
    for (const name of ["Button", "Input"]) {
      const c = studioDesign.components.find((x) => x.name === name);
      expect(c, `${name} missing from contract`).toBeDefined();
      expect(hasAllRequiredStates(c!), `${name} missing required states`).toBe(true);
    }
  });

  it("declares anti-patterns and an AA accessibility floor", () => {
    expect(studioDesign.antiPatterns.length).toBeGreaterThan(0);
    expect(studioDesign.brand.a11y.contrastFloor).toBe("AA");
    expect(studioDesign.brand.a11y.minTouchTargetPx).toBeGreaterThanOrEqual(44);
  });
});
