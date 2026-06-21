import { describe, expect, it } from "vitest";
import {
  BODY_MAX,
  FeedbackValidationError,
  validateNewFeedback,
} from "./validation";
import type { NewFeedback } from "./types";

const base: NewFeedback = {
  productId: "cosplay-cad",
  type: "feature",
  body: "Add EVA foam thickness offset",
  context: { url: "https://cosplay-cad.app/editor", appVersion: "1.0.0" },
};

describe("validateNewFeedback", () => {
  it("accepts a valid payload", () => {
    expect(validateNewFeedback(base)).toBe(base);
  });

  it.each([
    [{ ...base, productId: "  " }, "productId"],
    [{ ...base, type: "nope" as NewFeedback["type"] }, "type"],
    [{ ...base, body: "x" }, "body"],
    [{ ...base, body: "x".repeat(BODY_MAX + 1) }, "body"],
    [{ ...base, context: { url: "", appVersion: "1.0.0" } }, "context.url"],
    [
      { ...base, context: { url: "https://a", appVersion: " " } },
      "context.appVersion",
    ],
  ])("rejects invalid input (%#) on field %s", (input, field) => {
    try {
      validateNewFeedback(input as NewFeedback);
      throw new Error("expected validation to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(FeedbackValidationError);
      expect((err as FeedbackValidationError).field).toBe(field);
    }
  });
});
