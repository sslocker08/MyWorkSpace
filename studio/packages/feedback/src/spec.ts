import type { FeedbackItem } from "./types";

/** Structured Phase-1 spec stub derived from a feedback item. */
export interface SpecStub {
  title: string;
  productId: string;
  type: FeedbackItem["type"];
  body: string;
  votes: number;
  /** Trace back to the originating feedback item. */
  sourceId: string;
  context: FeedbackItem["context"];
}

const TITLE_MAX = 80;

function toTitle(item: FeedbackItem): string {
  const firstLine = item.body.split("\n", 1)[0].trim();
  const clipped =
    firstLine.length > TITLE_MAX
      ? `${firstLine.slice(0, TITLE_MAX - 1).trimEnd()}…`
      : firstLine;
  return `[${item.type}] ${clipped}`;
}

/**
 * Turn an in-tool request into a build-orchestrator Phase-1 input ("すぐ反映"
 * by construction). The triage board feeds these into the build pipeline.
 */
export function toSpecStub(item: FeedbackItem): SpecStub {
  return {
    title: toTitle(item),
    productId: item.productId,
    type: item.type,
    body: item.body,
    votes: item.votes,
    sourceId: item.id,
    context: item.context,
  };
}

/** Render a spec stub as the markdown brief consumed by the build pipeline. */
export function renderSpecMarkdown(item: FeedbackItem): string {
  const stub = toSpecStub(item);
  return [
    `# ${stub.title}`,
    "",
    `- **product**: ${stub.productId}`,
    `- **type**: ${stub.type}`,
    `- **votes**: ${stub.votes}`,
    `- **source**: feedback:${stub.sourceId}`,
    `- **context**: ${stub.context.url} (v${stub.context.appVersion}${
      stub.context.featureId ? `, feature:${stub.context.featureId}` : ""
    })`,
    "",
    "## Request",
    stub.body,
  ].join("\n");
}
