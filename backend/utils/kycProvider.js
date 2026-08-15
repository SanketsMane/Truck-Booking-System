const axios = require("axios");
const PlatformSetting = require("../models/platformSettingModel");
const { encrypt, decrypt } = require("./crypto");

// Same shape as utils/smsProvider.js / emailProvider.js: admin-configured
// via PlatformSetting, encrypted at rest, "manual" is the safe no-op
// default. "manual" always returns manual_review — i.e. today's
// upload-then-admin-queue flow, unchanged — so nothing about existing
// behavior changes until an admin actually configures a real provider.
//
// "custom_http" is a generic seam for a real OCR/DigiLocker/Aadhaar-style
// vendor: posts the document list to an admin-configured webhook and
// expects back { status: "verified"|"rejected"|"manual_review", note? }.
// No such vendor is wired in by this codebase — plugging one in later is a
// Settings-page config change, not a code change.
const KYC_PROVIDER_FIELDS = {
  manual: [],
  custom_http: ["url", "headers"],
};

const getConfig = async () => {
  const settings = await PlatformSetting.getSettings();
  const provider = settings.kyc?.provider || "manual";
  if (!settings.kyc?.encryptedConfig) return { provider, config: {} };
  try {
    return { provider, config: JSON.parse(decrypt(settings.kyc.encryptedConfig)) };
  } catch {
    return { provider, config: {} };
  }
};

const setConfig = async (provider, config, adminId) => {
  const settings = await PlatformSetting.getSettings();
  settings.kyc = {
    provider,
    encryptedConfig: encrypt(JSON.stringify(config)),
    updatedAt: new Date(),
    updatedBy: adminId,
  };
  await settings.save();
};

const ALLOWED_STATUSES = ["verified", "rejected", "manual_review"];

const verifyViaCustomHttp = async (type, documents, config) => {
  const { url, headers = {} } = config;
  try {
    const res = await axios.post(url, { type, documents }, { headers, timeout: 15000 });
    const status = res.data?.status;
    if (!ALLOWED_STATUSES.includes(status)) {
      return { status: "manual_review", note: "KYC provider returned an unrecognized response — routed to manual review." };
    }
    return { status, note: res.data?.note };
  } catch (error) {
    // A vendor outage/misconfiguration should never silently pass or block
    // signup — fall back to the safe default (a human looks at it).
    console.error("[kycProvider] custom_http verification failed:", error.message);
    return { status: "manual_review", note: "KYC provider request failed — routed to manual review." };
  }
};

// documents: [{docType, fileId}], as already submitted via POST /verification.
const verifyDocuments = async (type, documents) => {
  const { provider, config } = await getConfig();

  if (provider === "custom_http") {
    return verifyViaCustomHttp(type, documents, config);
  }
  return { status: "manual_review" };
};

module.exports = { verifyDocuments, getConfig, setConfig, KYC_PROVIDER_FIELDS };
