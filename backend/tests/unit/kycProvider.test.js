jest.mock("axios");
const axios = require("axios");
const kycProvider = require("../../utils/kycProvider");

const DOCS = [{ docType: "aadhaar", fileId: "abc123" }];

describe("kycProvider", () => {
  it("defaults to manual, returning manual_review without any HTTP call", async () => {
    const decision = await kycProvider.verifyDocuments("shipper", DOCS);
    expect(decision).toEqual({ status: "manual_review" });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("custom_http: posts the documents and returns the vendor's status", async () => {
    await kycProvider.setConfig("custom_http", { url: "https://kyc.example.com/verify" }, null);
    axios.post.mockResolvedValueOnce({ data: { status: "verified", note: "Looks good" } });

    const decision = await kycProvider.verifyDocuments("shipper", DOCS);

    expect(decision).toEqual({ status: "verified", note: "Looks good" });
    expect(axios.post).toHaveBeenCalledWith(
      "https://kyc.example.com/verify",
      { type: "shipper", documents: DOCS },
      expect.objectContaining({ headers: {} })
    );
  });

  it("custom_http: an unrecognized status falls back to manual_review", async () => {
    await kycProvider.setConfig("custom_http", { url: "https://kyc.example.com/verify" }, null);
    axios.post.mockResolvedValueOnce({ data: { status: "not-a-real-status" } });

    const decision = await kycProvider.verifyDocuments("shipper", DOCS);
    expect(decision.status).toBe("manual_review");
  });

  it("custom_http: a request failure falls back to manual_review instead of throwing", async () => {
    await kycProvider.setConfig("custom_http", { url: "https://kyc.example.com/verify" }, null);
    axios.post.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const decision = await kycProvider.verifyDocuments("shipper", DOCS);
    expect(decision.status).toBe("manual_review");
  });
});
