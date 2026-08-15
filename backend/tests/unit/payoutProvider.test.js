jest.mock("axios");
const axios = require("axios");
const payoutProvider = require("../../utils/payoutProvider");
const { encryptPayoutDetails } = require("../../utils/withdrawalCrypto");

const buildWithdrawalRequest = () => {
  const payoutMethod = "upi";
  const upiId = "transporter@upi";
  return {
    _id: "wid123",
    amount: 500,
    payoutMethod,
    ...encryptPayoutDetails({ payoutMethod, upiId }),
  };
};

describe("payoutProvider", () => {
  it("defaults to manual, returning null (no automated attempt) without any HTTP call", async () => {
    const decision = await payoutProvider.initiatePayout(buildWithdrawalRequest());
    expect(decision).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("custom_http: posts the withdrawal with decrypted payout details and returns the vendor's status", async () => {
    await payoutProvider.setConfig("custom_http", { url: "https://payout.example.com/pay" }, null);
    axios.post.mockResolvedValueOnce({ data: { status: "completed", reference: "REF-1" } });

    const decision = await payoutProvider.initiatePayout(buildWithdrawalRequest());

    expect(decision).toEqual({ status: "completed", reference: "REF-1" });
    expect(axios.post).toHaveBeenCalledWith(
      "https://payout.example.com/pay",
      expect.objectContaining({ withdrawalId: "wid123", amount: 500, upiId: "transporter@upi" }),
      expect.objectContaining({ headers: {} })
    );
  });

  it("custom_http: an unrecognized status falls back to failed (left for manual payout)", async () => {
    await payoutProvider.setConfig("custom_http", { url: "https://payout.example.com/pay" }, null);
    axios.post.mockResolvedValueOnce({ data: { status: "not-a-real-status" } });

    const decision = await payoutProvider.initiatePayout(buildWithdrawalRequest());
    expect(decision.status).toBe("failed");
  });

  it("custom_http: a request failure falls back to failed instead of throwing", async () => {
    await payoutProvider.setConfig("custom_http", { url: "https://payout.example.com/pay" }, null);
    axios.post.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const decision = await payoutProvider.initiatePayout(buildWithdrawalRequest());
    expect(decision.status).toBe("failed");
  });
});
