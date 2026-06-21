import {
  STATUS_ORDER,
  type FeedbackClient,
  type FeedbackItem,
  type FeedbackMetrics,
  type FeedbackStatus,
  type NewFeedback,
} from "./types";
import { InMemoryFeedbackStore, type FeedbackStore } from "./store";
import { validateNewFeedback } from "./validation";

export type IdGenerator = () => string;
export type Clock = () => Date;

export interface DefaultFeedbackClientOptions {
  store?: FeedbackStore;
  /** Override for deterministic tests. Defaults to crypto.randomUUID. */
  idGen?: IdGenerator;
  /** Override for deterministic tests. Defaults to () => new Date(). */
  clock?: Clock;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function defaultIdGen(): string {
  // crypto.randomUUID exists in modern browsers and Node >= 19.
  return globalThis.crypto.randomUUID();
}

/**
 * Status may advance forward along STATUS_ORDER, or branch to `declined` from
 * any non-terminal state. Backward moves and re-deciding terminal states throw.
 */
function assertValidTransition(
  from: FeedbackStatus,
  to: FeedbackStatus,
): void {
  if (from === to) return;
  if (from === "shipped" || from === "declined") {
    throw new Error(`cannot change status from terminal state "${from}"`);
  }
  if (to === "declined") return;
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);
  if (toIdx === -1) {
    throw new Error(`unknown target status "${to}"`);
  }
  if (toIdx <= fromIdx) {
    throw new Error(`status cannot move backward: "${from}" -> "${to}"`);
  }
}

/**
 * Default client backed by a pluggable store. Owns id/timestamp assignment,
 * validation, vote increments, lifecycle transitions, and KPI metrics.
 */
export class DefaultFeedbackClient implements FeedbackClient {
  private readonly store: FeedbackStore;
  private readonly idGen: IdGenerator;
  private readonly clock: Clock;

  constructor(opts: DefaultFeedbackClientOptions = {}) {
    this.store = opts.store ?? new InMemoryFeedbackStore();
    this.idGen = opts.idGen ?? defaultIdGen;
    this.clock = opts.clock ?? (() => new Date());
  }

  async submit(input: NewFeedback): Promise<FeedbackItem> {
    validateNewFeedback(input);
    const now = this.clock().toISOString();
    const item: FeedbackItem = {
      id: this.idGen(),
      productId: input.productId,
      type: input.type,
      body: input.body.trim(),
      context: input.context,
      votes: 0,
      status: "new",
      createdAt: now,
      updatedAt: now,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.screenshotUrl ? { screenshotUrl: input.screenshotUrl } : {}),
    };
    await this.store.insert(item);
    return item;
  }

  /** Public roadmap order: most-voted first, then newest. */
  async list(productId: string): Promise<FeedbackItem[]> {
    const items = await this.store.listByProduct(productId);
    return items.sort(
      (a, b) =>
        b.votes - a.votes || b.createdAt.localeCompare(a.createdAt),
    );
  }

  async vote(id: string): Promise<FeedbackItem> {
    const item = await this.requireItem(id);
    const updated: FeedbackItem = {
      ...item,
      votes: item.votes + 1,
      updatedAt: this.clock().toISOString(),
    };
    await this.store.update(updated);
    return updated;
  }

  async updateStatus(
    id: string,
    status: FeedbackStatus,
  ): Promise<FeedbackItem> {
    const item = await this.requireItem(id);
    assertValidTransition(item.status, status);
    const now = this.clock().toISOString();
    const updated: FeedbackItem = {
      ...item,
      status,
      updatedAt: now,
      ...(status === "shipped" && !item.shippedAt ? { shippedAt: now } : {}),
    };
    await this.store.update(updated);
    return updated;
  }

  async getMetrics(productId?: string): Promise<FeedbackMetrics> {
    const items = productId
      ? await this.store.listByProduct(productId)
      : await this.store.all();

    const byStatus = {
      new: 0,
      triaged: 0,
      planned: 0,
      in_progress: 0,
      shipped: 0,
      declined: 0,
    } satisfies FeedbackMetrics["byStatus"];

    let totalVotes = 0;
    const leadTimes: number[] = [];
    for (const item of items) {
      byStatus[item.status] += 1;
      totalVotes += item.votes;
      if (item.status === "shipped" && item.shippedAt) {
        leadTimes.push(
          (Date.parse(item.shippedAt) - Date.parse(item.createdAt)) /
            MS_PER_DAY,
        );
      }
    }

    const meanLeadTimeDays =
      leadTimes.length > 0
        ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
        : null;

    return {
      totalRequests: items.length,
      totalVotes,
      byStatus,
      meanLeadTimeDays,
    };
  }

  private async requireItem(id: string): Promise<FeedbackItem> {
    const item = await this.store.get(id);
    if (!item) {
      throw new Error(`feedback item ${id} not found`);
    }
    return item;
  }
}
