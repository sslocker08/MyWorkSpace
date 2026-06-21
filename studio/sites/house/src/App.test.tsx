import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DefaultFeedbackClient } from "@mwstudio/feedback";
import { App } from "./App";

describe("House site (Wave 0 shared-layer integration)", () => {
  it("renders the portfolio using @mwstudio/ui primitives", () => {
    render(<App feedbackClient={new DefaultFeedbackClient()} />);
    expect(
      screen.getByRole("heading", { name: /競合が少ない/ }),
    ).toBeInTheDocument();
    // @mwstudio/ui Button
    expect(
      screen.getByRole("button", { name: /ポートフォリオを見る/ }),
    ).toHaveClass("mwui-btn");
    // data-driven Card content
    expect(screen.getByText(/Cosplay foam-armor CAD/)).toBeInTheDocument();
    expect(screen.getAllByText("FAB").length).toBeGreaterThan(0);
  });

  it("lets a visitor file an in-tool feedback request via @mwstudio/feedback", async () => {
    const user = userEvent.setup();
    const client = new DefaultFeedbackClient();
    render(<App feedbackClient={client} />);

    await user.click(screen.getByRole("button", { name: /リクエスト/ }));
    await user.type(
      screen.getByLabelText("内容"),
      "Add a dark-mode toggle to the house site",
    );
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByText(/受け付けました/)).toBeInTheDocument();

    // the request reached the client with auto-captured context from this app
    const list = await client.list("house");
    expect(list).toHaveLength(1);
    expect(list[0].context.featureId).toBe("home");
    expect(list[0].body).toContain("dark-mode toggle");
  });
});
