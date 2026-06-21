import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackWidget } from "./widget";
import { DefaultFeedbackClient } from "./client";

describe("FeedbackWidget", () => {
  it("opens the dialog and submits an in-tool request via the client", async () => {
    const user = userEvent.setup();
    const client = new DefaultFeedbackClient();
    const onSubmitted = vi.fn();

    render(
      <FeedbackWidget
        client={client}
        productId="cosplay-cad"
        appVersion="1.0.0"
        featureId="editor"
        onSubmitted={onSubmitted}
      />,
    );

    // dialog is closed initially
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /リクエスト/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("内容"),
      "Add EVA foam thickness offset",
    );
    await user.click(screen.getByRole("button", { name: "送信" }));

    // success state shown + callback fired
    expect(await screen.findByText(/受け付けました/)).toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalledOnce();

    // the request reached the client, with auto-captured context
    const list = await client.list("cosplay-cad");
    expect(list).toHaveLength(1);
    expect(list[0].body).toBe("Add EVA foam thickness offset");
    expect(list[0].context.featureId).toBe("editor");
  });

  it("blocks submit and shows an error when the body is too short", async () => {
    const user = userEvent.setup();
    const client = new DefaultFeedbackClient();
    const submit = vi.spyOn(client, "submit");

    render(
      <FeedbackWidget client={client} productId="reef-sim" appVersion="1.0.0" />,
    );

    await user.click(screen.getByRole("button", { name: /リクエスト/ }));
    await user.type(screen.getByLabelText("内容"), "x");
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
