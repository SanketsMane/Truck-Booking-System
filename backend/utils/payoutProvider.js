const axios = require("axios");
const PlatformSetting = require("../models/platformSettingModel");
const { encrypt, decrypt } = require("./crypto");
const { decryptPayoutDetails } = require("./withdrawalCrypto");

// Same shape as utils/kycProvider.js: admin-configured, encrypted at rest,
// "manual" is the safe no-op default — the existing admin-transfers-money-
// outside-the-app-then-marks-paid flow, unchanged. "custom_http" is a
// generic seam for a real payout rail (Razorpay Route/X or similar): posts
// the withdrawal + decrypted payout details to an admin-configured
// webhook and expects back { status: "completed"|"processing"|"failed",
// reference? }. No such vendor is wired in — plugging one in later is a
// Settings-page config change, not a code change.
const PAYOUT_PROVIDER_FIELDS = {
  manual: [],
  custom_http: ["url", "headers"],
};

const getConfig = async () => {
  const settings = await PlatformSetting.getSettings();
  const provider = settings.payout?.provider || "manual";
  if (!settings.payout?.encryptedConfig) return { provider, config: {} };
  try {
    return { provider, config: JSON.parse(decrypt(settings.payout.encryptedConfig)) };
  } catch {
    return { provider, config: {} };
  }
};

const setConfig = async (provider, config, adminId) => {
  const settings = await PlatformSetting.getSettings();
  settings.payout = {
    provider,
    encryptedConfig: encrypt(JSON.stringify(config)),
    updatedAt: new Date(),
    updatedBy: adminId,
  };
  await settings.save();
};

const ALLOWED_STATUSES = ["completed", "processing", "failed"];

const payoutViaCustomHttp = async (withdrawalRequest, config) => {
  const { url, headers = {} } = config;
  const payload = {
    withdrawalId: withdrawalRequest._id,
    amount: withdrawalRequest.amount,
    payoutMethod: withdrawalRequest.payoutMethod,
    ...decryptPayoutDetails(withdrawalRequest),
  };
  try {
    const res = await axios.post(url, payload, { headers, timeout: 15000 });
    const status = res.data?.status;
    if (!ALLOWED_STATUSES.includes(status)) {
      return { status: "failed", note: "Payout provider returned an unrecognized response — left for manual payout." };
    }
    return { status, reference: res.data?.reference };
  } catch (error) {
    console.error("[payoutProvider] custom_http payout failed:", error.message);
    return { status: "failed", note: "Payout provider request failed — left for manual payout." };
  }
};

// Returns null when the provider is "manual" — callers treat that as "no
// automated attempt was made, fall back to the existing manual flow" rather
// than a failed attempt.
const initiatePayout = async (withdrawalRequest) => {
  const { provider, config } = await getConfig();

  if (provider === "custom_http") {
    return payoutViaCustomHttp(withdrawalRequest, config);
  }
  return null;
};

module.exports = { initiatePayout, getConfig, setConfig, PAYOUT_PROVIDER_FIELDS };
