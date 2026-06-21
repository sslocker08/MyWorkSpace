import type { FeedbackItem } from "./types";

/**
 * Persistence abstraction. Wave 0 ships an in-memory implementation; a real
 * backend (cms-admin-architecture + a DB table) implements the same interface
 * so the client and widget are unchanged.
 */
export interface FeedbackStore {
  insert(item: FeedbackItem): Promise<void>;
  get(id: string): Promise<FeedbackItem | undefined>;
  update(item: FeedbackItem): Promise<void>;
  /**
   * Atomically increment an item's vote count and return the updated item.
   * Votes are the public-roadmap signal, so this MUST be atomic — never a
   * client-side read-modify-write (which loses concurrent votes). Real
   * backends implement it as `UPDATE ... SET votes = votes + 1 RETURNING *`
   * or a compare-and-swap. Throws if the item does not exist.
   */
  incrementVotes(id: string, updatedAt: string): Promise<FeedbackItem>;
  listByProduct(productId: string): Promise<FeedbackItem[]>;
  all(): Promise<FeedbackItem[]>;
}

export class InMemoryFeedbackStore implements FeedbackStore {
  private readonly items = new Map<string, FeedbackItem>();

  async insert(item: FeedbackItem): Promise<void> {
    if (this.items.has(item.id)) {
      throw new Error(`feedback item ${item.id} already exists`);
    }
    this.items.set(item.id, { ...item });
  }

  async get(id: string): Promise<FeedbackItem | undefined> {
    const found = this.items.get(id);
    return found ? { ...found } : undefined;
  }

  async update(item: FeedbackItem): Promise<void> {
    if (!this.items.has(item.id)) {
      throw new Error(`feedback item ${item.id} not found`);
    }
    this.items.set(item.id, { ...item });
  }

  async incrementVotes(
    id: string,
    updatedAt: string,
  ): Promise<FeedbackItem> {
    // Read + write happen with no intervening await, so under the JS
    // single-threaded model this is atomic: concurrent calls cannot interleave
    // and lose an increment.
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`feedback item ${id} not found`);
    }
    const updated: FeedbackItem = {
      ...current,
      votes: current.votes + 1,
      updatedAt,
    };
    this.items.set(id, updated);
    return { ...updated };
  }

  async listByProduct(productId: string): Promise<FeedbackItem[]> {
    return [...this.items.values()]
      .filter((i) => i.productId === productId)
      .map((i) => ({ ...i }));
  }

  async all(): Promise<FeedbackItem[]> {
    return [...this.items.values()].map((i) => ({ ...i }));
  }
}
