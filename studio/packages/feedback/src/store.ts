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

  async listByProduct(productId: string): Promise<FeedbackItem[]> {
    return [...this.items.values()]
      .filter((i) => i.productId === productId)
      .map((i) => ({ ...i }));
  }

  async all(): Promise<FeedbackItem[]> {
    return [...this.items.values()].map((i) => ({ ...i }));
  }
}
