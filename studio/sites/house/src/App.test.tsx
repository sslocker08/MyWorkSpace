import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DefaultFeedbackClient } from "@mwstudio/feedback";
import { Analytics, InMemorySink } from "@mwstudio/analytics";
import { AnalyticsProvider } from "@mwstudio/analytics/react";
import { App } from "./App";

function renderApp() {
  const feedbackClient = new DefaultFeedbackClient();
  const sink = new InMemorySink();
  const analytics = new Analytics({
    productId: "house",
    appVersion: "0.1.0",
    sink,
  });
  render(
    <AnalyticsProvider analytics={analytics}>
      <App feedbackClient={feedbackClient} />
    </AnalyticsProvider>,
  );
  return { feedbackClient, sink };
}

describe("House site (Wave 0 shared-layer integration)", () => {
  it("renders the portfolio using @mwstudio/ui primitives", () => {
    renderApp();
    expect(
      screen.getByRole("heading", { name: /競合が少ない/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ポートフォリオを見る/ }),
    ).toHaveClass("mwui-btn");
    expect(screen.getByText(/Cosplay foam-armor CAD/)).toBeInTheDocument();
    expect(screen.getAllByText("FAB").length).toBeGreaterThan(0);
  });

  it("tracks a page_view on load via @mwstudio/analytics", () => {
    const { sink } = renderApp();
    expect(sink.byName("page_view")).toHaveLength(1);
    expect(sink.byName("page_view")[0].props).toEqual({ path: "/" });
  });

  it("tracks cta_click when the hero CTA is pressed", async () => {
    const user = userEvent.setup();
    const { sink } = renderApp();
    await user.click(screen.getByRole("button", { name: /ポートフォリオを見る/ }));
    expect(sink.byName("cta_click")[0].props).toEqual({ id: "hero-portfolio" });
  });

  it("files an in-tool request and tracks feedback_submitted end to end", async () => {
    const user = userEvent.setup();
    const { feedbackClient, sink } = renderApp();

    await user.click(screen.getByRole("button", { name: /リクエスト/ }));
    await user.type(
      screen.getByLabelText("内容"),
      "Add a dark-mode toggle to the house site",
    );
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByText(/受け付けました/)).toBeInTheDocument();

    const list = await feedbackClient.list("house");
    expect(list).toHaveLength(1);
    expect(list[0].context.featureId).toBe("home");

    const tracked = sink.byName("feedback_submitted");
    expect(tracked).toHaveLength(1);
    expect(tracked[0].props.feedbackId).toBe(list[0].id);
  });
});
