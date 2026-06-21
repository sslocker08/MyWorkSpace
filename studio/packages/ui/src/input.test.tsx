import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("marks aria-invalid and adds the error class on error", () => {
    render(<Input error aria-label="email" />);
    const input = screen.getByLabelText("email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("mwui-input", "mwui-input--error");
  });

  it("adds the success class without aria-invalid", () => {
    render(<Input success aria-label="email" />);
    const input = screen.getByLabelText("email");
    expect(input).toHaveClass("mwui-input--success");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("is a controlled-capable text field", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="name" />);
    const input = screen.getByLabelText("name");
    await user.type(input, "hi");
    expect(input).toHaveValue("hi");
  });
});
