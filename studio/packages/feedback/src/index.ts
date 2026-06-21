// @mwstudio/feedback — framework-agnostic core entry ("." export).
// The React widget is a separate entry: `@mwstudio/feedback/widget`.
export type * from "./types";
export {
  FEEDBACK_TYPES,
  STATUS_ORDER,
} from "./types";
export { captureContext } from "./context";
export {
  validateNewFeedback,
  FeedbackValidationError,
  BODY_MIN,
  BODY_MAX,
} from "./validation";
export { InMemoryFeedbackStore, type FeedbackStore } from "./store";
export {
  DefaultFeedbackClient,
  type DefaultFeedbackClientOptions,
  type IdGenerator,
  type Clock,
} from "./client";
export { toSpecStub, renderSpecMarkdown, type SpecStub } from "./spec";
