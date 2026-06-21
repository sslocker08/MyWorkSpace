import { describe, expect, it } from "vitest";
import { renderSpecMarkdown, toSpecStub } from "./spec";
import type { FeedbackItem } from "./types";

const item: FeedbackItem = {
  id: "fb-42",
  productId: "cosplay-cad",
  type: "feature",
  body: "Add foam thickness offset\nso seams account for material depth",
  context: {
    url: "https://cosplay-cad.app/editor",
    appVersion: "1.2.0",
    featureId: "unfold",
  },
  votes: 7,
  status: "triaged",
  createdAt: "2026-06-21T00:00:00.000Z",
  updatedAt: "2026-06-21T00:00:00.000Z",
};

describe("toSpecStub", () => {
  it("maps a feedback item into a Phase-1 spec stub", () => {
    const stub = toSpecStub(item);
    expect(stub.sourceId).toBe("fb-42");
    expect(stub.productId).toBe("cosplay-cad");
    expect(stub.votes).toBe(7);
    // title is the first line, tagged by type
    expect(stub.title).toBe("[feature] Add foam thickness offset");
  });
});

describe("renderSpecMarkdown", () => {
  it("renders a build-pipeline brief with traceable source + context", () => {
    const md = renderSpecMarkdown(item);
    expect(md).toContain("# [feature] Add foam thickness offset");
    expect(md).toContain("source**: feedback:fb-42");
    expect(md).toContain("v1.2.0");
    expect(md).toContain("feature:unfold");
    expect(md).toContain("## Request");
  });
});
