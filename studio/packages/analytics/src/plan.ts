import type { TrackingPlan } from "./types";

/**
 * The canonical Studio tracking plan — the shared funnel/retention events every
 * product emits. Products may extend this with their own domain events via
 * `extendPlan`. Keep names snake_case and stable (renames break dashboards).
 */
export const studioPlan = {
  page_view: { description: "A screen/route was viewed", required: ["path"] },
  cta_click: { description: "A primary CTA was clicked", required: ["id"] },
  signup_started: { description: "Signup/registration began" },
  signup_completed: { description: "Account created", required: ["plan"] },
  checkout_started: { description: "Purchase/subscription began", required: ["sku"] },
  purchase_completed: {
    description: "Payment succeeded",
    required: ["sku", "amount", "currency"],
  },
  feedback_opened: { description: "In-tool feedback widget opened" },
  feedback_submitted: {
    description: "An in-tool feature request was filed",
    required: ["feedbackId"],
  },
} satisfies TrackingPlan;

export type StudioEventName = keyof typeof studioPlan;

/** Merge product-specific events onto the canon. */
export function extendPlan<E extends TrackingPlan>(
  extra: E,
): TrackingPlan & typeof studioPlan & E {
  return { ...studioPlan, ...extra };
}
