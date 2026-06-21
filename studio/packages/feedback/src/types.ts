// @mwstudio/feedback — shared in-app feature-request / feedback widget.
//
// Goal (per docs/HUMAN-VS-AI.md): every product ships an IN-TOOL request form
// (not an email form). One-click modal, auto-attaches the current screen
// context, supports voting + a public roadmap, and writes to a shared backend
// that feeds build-orchestrator's Phase 1 ("すぐ反映" by construction).
//
// This is a Wave 0 interface stub. Implementation pulls the latest Skills at
// build time: cms-admin-architecture (triage board), realtime-live-backend
// (vote/status sync), web-analytics-measurement (KPIs), ui (shared widget).

export type FeedbackType = "feature" | "bug" | "improvement";

export type FeedbackStatus =
  | "new"
  | "triaged"
  | "planned"
  | "in_progress"
  | "shipped"
  | "declined";

/** Auto-captured so the user doesn't have to describe where they are. */
export interface FeedbackContext {
  url: string;
  featureId?: string;
  appVersion: string;
}

export interface FeedbackItem {
  id: string;
  productId: string;
  userId?: string;
  type: FeedbackType;
  body: string;
  screenshotUrl?: string;
  context: FeedbackContext;
  votes: number;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

/** Payload submitted from the in-app modal. votes/status/timestamps are server-assigned. */
export type NewFeedback = Pick<
  FeedbackItem,
  "productId" | "type" | "body" | "context"
> &
  Partial<Pick<FeedbackItem, "userId" | "screenshotUrl">>;

export interface FeedbackClient {
  submit(input: NewFeedback): Promise<FeedbackItem>;
  list(productId: string): Promise<FeedbackItem[]>;
  vote(id: string): Promise<FeedbackItem>;
}

/** KPI surface (retention-lifecycle): request volume, votes, ship lead-time. */
export interface FeedbackMetrics {
  totalRequests: number;
  totalVotes: number;
  /** mean days from `new` → `shipped` */
  meanLeadTimeDays: number;
}
