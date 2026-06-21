import { beforeEach, describe, expect, it } from "vitest";
import { DefaultFeedbackClient } from "./client";
import { FeedbackValidationError } from "./validation";
import type { NewFeedback } from "./types";

function makeClient() {
  let n = 0;
  let t = Date.parse("2026-06-21T00:00:00.000Z");
  return new DefaultFeedbackClient({
    idGen: () => `id-${++n}`,
    // each call advances the clock by one day for deterministic lead times
    clock: () => {
      const d = new Date(t);
      t += 24 * 60 * 60 * 1000;
      return d;
    },
  });
}

const payload = (over: Partial<NewFeedback> = {}): NewFeedback => ({
  productId: "reef-sim",
  type: "feature",
  body: "Forecast alkalinity given a dosing plan",
  context: { url: "https://reef-sim.app", appVersion: "1.0.0" },
  ...over,
});

describe("DefaultFeedbackClient", () => {
  let client: DefaultFeedbackClient;
  beforeEach(() => {
    client = makeClient();
  });

  it("assigns id/status/votes/timestamps on submit and trims body", async () => {
    const item = await client.submit(payload({ body: "  hello world  " }));
    expect(item.id).toBe("id-1");
    expect(item.status).toBe("new");
    expect(item.votes).toBe(0);
    expect(item.body).toBe("hello world");
    expect(item.createdAt).toBe("2026-06-21T00:00:00.000Z");
    expect(item.updatedAt).toBe(item.createdAt);
  });

  it("propagates validation errors from submit", async () => {
    await expect(client.submit(payload({ body: "x" }))).rejects.toBeInstanceOf(
      FeedbackValidationError,
    );
  });

  it("lists most-voted first, then newest", async () => {
    const a = await client.submit(payload({ body: "first request" }));
    const b = await client.submit(payload({ body: "second request" }));
    const c = await client.submit(payload({ body: "third request" }));
    await client.vote(b.id); // b: 1 vote

    const list = await client.list("reef-sim");
    expect(list.map((i) => i.id)).toEqual([b.id, c.id, a.id]);
  });

  it("scopes lists by product", async () => {
    await client.submit(payload({ productId: "reef-sim" }));
    await client.submit(payload({ productId: "choir-arranger" }));
    expect(await client.list("reef-sim")).toHaveLength(1);
    expect(await client.list("choir-arranger")).toHaveLength(1);
  });

  it("increments votes and bumps updatedAt", async () => {
    const item = await client.submit(payload());
    const voted = await client.vote(item.id);
    expect(voted.votes).toBe(1);
    expect(voted.updatedAt).not.toBe(item.updatedAt);
  });

  it("advances status forward and records shippedAt once", async () => {
    const item = await client.submit(payload());
    await client.updateStatus(item.id, "triaged");
    await client.updateStatus(item.id, "planned");
    const shipped = await client.updateStatus(item.id, "shipped");
    expect(shipped.status).toBe("shipped");
    expect(shipped.shippedAt).toBeDefined();
  });

  it("rejects backward and terminal transitions", async () => {
    const item = await client.submit(payload());
    await client.updateStatus(item.id, "planned");
    await expect(
      client.updateStatus(item.id, "triaged"),
    ).rejects.toThrow(/backward/);
    await client.updateStatus(item.id, "shipped");
    await expect(
      client.updateStatus(item.id, "in_progress"),
    ).rejects.toThrow(/terminal/);
  });

  it("computes metrics including mean lead time over shipped items", async () => {
    // submit at day0, ship later -> lead time measured in whole days
    const item = await client.submit(payload());
    await client.updateStatus(item.id, "triaged");
    await client.updateStatus(item.id, "planned");
    await client.updateStatus(item.id, "in_progress");
    await client.updateStatus(item.id, "shipped");

    const open = await client.submit(payload({ body: "still open request" }));
    await client.vote(open.id);

    const m = await client.getMetrics("reef-sim");
    expect(m.totalRequests).toBe(2);
    expect(m.totalVotes).toBe(1);
    expect(m.byStatus.shipped).toBe(1);
    expect(m.byStatus.new).toBe(1);
    // submit(day0) then 4 status updates advance the clock 4 days before shipped
    expect(m.meanLeadTimeDays).toBe(4);
  });

  it("returns null lead time when nothing is shipped", async () => {
    await client.submit(payload());
    const m = await client.getMetrics();
    expect(m.meanLeadTimeDays).toBeNull();
  });
});
