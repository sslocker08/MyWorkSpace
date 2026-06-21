import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("applies intent and size classes", () => {
    render(
      <Button intent="secondary" size="lg">
        Go
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveClass("mwui-btn", "mwui-btn--secondary", "mwui-btn--lg");
  });

  it("loading disables the button, marks aria-busy, and shows a spinner", () => {
    const { container } = render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".mwui-btn__spinner")).toBeInTheDocument();
  });

  it("reflects error and success states", () => {
    const { rerender } = render(<Button error>x</Button>);
    expect(screen.getByRole("button")).toHaveClass("is-error");
    rerender(<Button success>x</Button>);
    expect(screen.getByRole("button")).toHaveClass("is-success");
  });

  it("fires onClick when enabled and not when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Tap</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <Button onClick={onClick} disabled>
        Tap
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
