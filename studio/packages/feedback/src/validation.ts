import { FEEDBACK_TYPES, type NewFeedback } from "./types";

export const BODY_MIN = 3;
export const BODY_MAX = 5000;

export class FeedbackValidationError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = "FeedbackValidationError";
  }
}

/** Throws FeedbackValidationError on the first invalid field; otherwise returns the input. */
export function validateNewFeedback(input: NewFeedback): NewFeedback {
  if (!input.productId?.trim()) {
    throw new FeedbackValidationError("productId is required", "productId");
  }
  if (!FEEDBACK_TYPES.includes(input.type)) {
    throw new FeedbackValidationError(
      `type must be one of ${FEEDBACK_TYPES.join(", ")}`,
      "type",
    );
  }
  const body = input.body?.trim() ?? "";
  if (body.length < BODY_MIN) {
    throw new FeedbackValidationError(
      `body must be at least ${BODY_MIN} characters`,
      "body",
    );
  }
  if (body.length > BODY_MAX) {
    throw new FeedbackValidationError(
      `body must be at most ${BODY_MAX} characters`,
      "body",
    );
  }
  if (!input.context?.url?.trim()) {
    throw new FeedbackValidationError("context.url is required", "context.url");
  }
  if (!input.context?.appVersion?.trim()) {
    throw new FeedbackValidationError(
      "context.appVersion is required",
      "context.appVersion",
    );
  }
  return input;
}
