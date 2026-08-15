import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../tests/renderWithProviders";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its children and responds to clicks", async () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Send OTP</Button>);

    const button = screen.getByRole("button", { name: "Send OTP" });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button onClick={onClick} disabled>
        Send OTP
      </Button>
    );

    await userEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects an explicit type attribute (e.g. type=submit inside a form)", () => {
    renderWithProviders(<Button type="submit">Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "submit");
  });
});
