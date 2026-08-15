import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../tests/renderWithProviders";
import { Card, CardRow } from "./Card";

describe("Card", () => {
  it("renders its children", () => {
    renderWithProviders(<Card>Trip summary</Card>);
    expect(screen.getByText("Trip summary")).toBeInTheDocument();
  });

  it("is clickable when $interactive, e.g. rendered as a link", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Card as="button" $interactive onClick={onClick}>
        Pune → Nashik
      </Card>
    );
    await userEvent.click(screen.getByText("Pune → Nashik"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("CardRow lays out its children in a row", () => {
    renderWithProviders(
      <CardRow>
        <span>Available capacity</span>
        <strong>15 t</strong>
      </CardRow>
    );
    expect(screen.getByText("Available capacity")).toBeInTheDocument();
    expect(screen.getByText("15 t")).toBeInTheDocument();
  });
});
