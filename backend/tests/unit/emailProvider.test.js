jest.mock("axios");
const axios = require("axios");
const emailProvider = require("../../utils/emailProvider");

describe("emailProvider", () => {
  beforeEach(() => {
    axios.post.mockClear();
  });

  it("defaults to console, logging instead of making any HTTP call", async () => {
    await emailProvider.sendEmail({ to: "someone@example.test", subject: "Hi", html: "<p>Hi</p>" });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("resend: sendEmail posts to the Resend API with the configured from-address and a bearer auth header", async () => {
    await emailProvider.setConfig(
      "resend",
      { apiKey: "re_test_key", fromAddress: "no-reply@truckgee.test", fromName: "TruckGee" },
      null
    );
    axios.post.mockResolvedValueOnce({ data: { id: "email_123" } });

    await emailProvider.sendEmail({ to: "someone@example.test", subject: "Hello", html: "<p>Hello</p>" });

    expect(axios.post).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      {
        from: "TruckGee <no-reply@truckgee.test>",
        to: ["someone@example.test"],
        subject: "Hello",
        html: "<p>Hello</p>",
      },
      { headers: { Authorization: "Bearer re_test_key", "Content-Type": "application/json" } }
    );
  });

  it("resend: sendTestEmail sends a branded test message through the same path", async () => {
    await emailProvider.setConfig("resend", { apiKey: "re_test_key", fromAddress: "no-reply@truckgee.test" }, null);
    axios.post.mockResolvedValueOnce({ data: { id: "email_456" } });

    await emailProvider.sendTestEmail("someone@example.test", "resend", {
      apiKey: "re_test_key",
      fromAddress: "no-reply@truckgee.test",
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body] = axios.post.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(body.to).toEqual(["someone@example.test"]);
    expect(body.subject).toMatch(/test email/i);
    expect(body.html).toContain("configured correctly");
  });

  it("resend: surfaces the vendor's error message instead of a bare HTTP status", async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 401, data: { name: "validation_error", message: "API key is invalid" } },
    });

    await expect(
      emailProvider.sendTestEmail("someone@example.test", "resend", {
        apiKey: "bad_key",
        fromAddress: "no-reply@truckgee.test",
      })
    ).rejects.toThrow("Resend: API key is invalid");
  });
});
