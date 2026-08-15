import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithProviders } from "../../tests/renderWithProviders";
import { CityAutocomplete } from "./CityAutocomplete";
import { searchCities } from "../../api/meta";

vi.mock("../../api/meta", () => ({
  searchCities: vi.fn(),
}));

// CityAutocomplete is a controlled component (value/onChange from its
// parent) — this stands in for that parent so typing actually updates
// what's displayed, same as it would inside a real form.
const Controlled = () => {
  const [value, setValue] = useState("");
  return <CityAutocomplete value={value} onChange={setValue} />;
};

// Real timers throughout (DEBOUNCE_MS is only 220ms, so this stays fast) —
// userEvent/fireEvent's own scheduling doesn't mix reliably with fake
// timers across React's effect flush, and what's under test here is the
// component's actual debounce delay, not simulated keystroke pacing.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CityAutocomplete", () => {
  beforeEach(() => {
    searchCities.mockReset();
    searchCities.mockResolvedValue({ cities: ["Pune", "Punegaon"] });
  });

  it("does not call the API until the debounce window elapses", async () => {
    renderWithProviders(<Controlled />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Pun" } });
    expect(searchCities).not.toHaveBeenCalled();

    await wait(260);
    expect(searchCities).toHaveBeenCalledWith("Pun");
  });

  it("collapses a burst of keystrokes into a single request", async () => {
    renderWithProviders(<Controlled />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "Pu" } });
    await wait(100); // well under the debounce window — must not fire yet
    fireEvent.change(input, { target: { value: "Pune" } });
    await wait(260);

    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(searchCities).toHaveBeenCalledWith("Pune");
  });

  it("shows suggestions once results arrive, and selecting one fills the input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled />);

    const input = screen.getByRole("combobox");
    await user.type(input, "Pun");

    const option = await screen.findByRole("option", { name: "Pune" });
    await user.click(option);

    expect(input).toHaveValue("Pune");
  });
});
