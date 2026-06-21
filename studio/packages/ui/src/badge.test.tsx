import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("defaults to the neutral variant", () => {
    render(<Badge>new</Badge>);
    expect(screen.getByText("new")).toHaveClass("mwui-badge", "mwui-badge--neutral");
  });

  it("applies the requested variant", () => {
    render(<Badge variant="success">shipped</Badge>);
    expect(screen.getByText("shipped")).toHaveClass("mwui-badge--success");
  });
});
