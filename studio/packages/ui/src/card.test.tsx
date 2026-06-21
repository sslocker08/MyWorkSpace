import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./card";

describe("Card", () => {
  it("composes header/body/footer slots", () => {
    const { container } = render(
      <Card>
        <Card.Header>Title</Card.Header>
        <Card.Body>Content</Card.Body>
        <Card.Footer>Actions</Card.Footer>
      </Card>,
    );
    expect(container.querySelector(".mwui-card")).toBeInTheDocument();
    expect(screen.getByText("Title")).toHaveClass("mwui-card__header");
    expect(screen.getByText("Content")).toHaveClass("mwui-card__body");
    expect(screen.getByText("Actions")).toHaveClass("mwui-card__footer");
  });
});
