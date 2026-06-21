// @mwstudio/feedback — shared domain types.
//
// Goal (docs/HUMAN-VS-AI.md): every Studio product ships an IN-TOOL request form
// (not email). One-click modal, auto-attaches the current screen context,
// supports voting + a public roadmap, and writes to a shared store that feeds
// build-orchestrator's Phase 1 ("すぐ反映" by construction).

export type FeedbackType = "feature" | "bug" | "improvement";

export const FEEDBACK_TYPES: readonly FeedbackType[] = [
  "feature",
  "bug",
  "improvement",
] as const;

export type FeedbackStatus =
  | "new"
  | "triaged"
  | "planned"
  | "in_progress"
  | "shipped"
  | "declined";

/** Forward lifecycle. `declined` is a terminal branch reachable from any open state. */
export const STATUS_ORDER: readonly FeedbackStatus[] = [
  "new",
  "triaged",
  "planned",
  "in_progress",
  "shipped",
] as const;

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
  /** Set when status first becomes `shipped`; powers lead-time KPI. */
  shippedAt?: string;
}

/** Payload submitted from the in-app modal. votes/status/timestamps are assigned by the client. */
export type NewFeedback = Pick<
  FeedbackItem,
  "productId" | "type" | "body" | "context"
> &
  Partial<Pick<FeedbackItem, "userId" | "screenshotUrl">>;

/** KPI surface (retention-lifecycle): request volume, votes, ship lead-time. */
export interface FeedbackMetrics {
  totalRequests: number;
  totalVotes: number;
  byStatus: Record<FeedbackStatus, number>;
  /** mean days from `createdAt` → `shippedAt` across shipped items; null if none shipped. */
  meanLeadTimeDays: number | null;
}

/** Client surface used by the widget and by backends/admin (cms-admin-architecture). */
export interface FeedbackClient {
  submit(input: NewFeedback): Promise<FeedbackItem>;
  list(productId: string): Promise<FeedbackItem[]>;
  vote(id: string): Promise<FeedbackItem>;
  updateStatus(id: string, status: FeedbackStatus): Promise<FeedbackItem>;
  getMetrics(productId?: string): Promise<FeedbackMetrics>;
}
