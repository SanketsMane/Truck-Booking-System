import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../tests/renderWithProviders";
import { Login } from "./Login";
import * as authApi from "../api/auth";

vi.mock("../api/auth", () => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const setUser = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ setUser }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("Login — OTP flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests an OTP for a valid mobile number and advances to the OTP step", async () => {
    authApi.requestOtp.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(authApi.requestOtp).toHaveBeenCalledWith("9876543210");
    expect(await screen.findByLabelText("OTP")).toBeInTheDocument();
  });

  it("does not call the API for an invalid mobile number", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText("Mobile number"), "12345");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(authApi.requestOtp).not.toHaveBeenCalled();
  });

  it("verifies the OTP and logs the user in", async () => {
    authApi.requestOtp.mockResolvedValue({ success: true });
    authApi.verifyOtp.mockResolvedValue({ user: { id: "u1", name: "Test" } });
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));
    await screen.findByLabelText("OTP");

    await user.type(screen.getByLabelText("OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(authApi.verifyOtp).toHaveBeenCalledWith(
      expect.objectContaining({ mobile: "9876543210", otp: "123456" })
    );
    expect(setUser).toHaveBeenCalledWith({ id: "u1", name: "Test" });
  });

  it("prompts for a name when the backend reports a new user", async () => {
    authApi.requestOtp.mockResolvedValue({ success: true });
    authApi.verifyOtp.mockRejectedValue(new Error("Name is required to complete signup"));
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));
    await screen.findByLabelText("OTP");
    await user.type(screen.getByLabelText("OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByLabelText("Your name")).toBeInTheDocument();
  });
});
