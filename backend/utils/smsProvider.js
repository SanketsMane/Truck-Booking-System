const axios = require("axios");
const PlatformSetting = require("../models/platformSettingModel");
const { encrypt, decrypt } = require("./crypto");
const { PHONE_CALLING_CODE } = require("../config/marketplaceConfig");

// Provider-specific field lists, used both to validate what an admin submits
// and to know what to mask when echoing config back to the Settings UI.
const SMS_PROVIDER_FIELDS = {
  console: [],
  twilio: ["accountSid", "authToken", "fromNumber"],
  msg91: ["authKey", "senderId", "route"],
  custom_http: ["method", "url", "headers", "bodyTemplate"],
};

const getConfig = async () => {
  const settings = await PlatformSetting.getSettings();
  const provider = settings.sms?.provider || "console";
  if (!settings.sms?.encryptedConfig) return { provider, config: {} };
  try {
    return { provider, config: JSON.parse(decrypt(settings.sms.encryptedConfig)) };
  } catch {
    return { provider, config: {} };
  }
};

const setConfig = async (provider, config, adminId) => {
  const settings = await PlatformSetting.getSettings();
  settings.sms = {
    provider,
    encryptedConfig: encrypt(JSON.stringify(config)),
    updatedAt: new Date(),
    updatedBy: adminId,
  };
  await settings.save();
};

const sendViaTwilio = async (mobile, message, config) => {
  const { accountSid, authToken, fromNumber } = config;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  await axios.post(
    url,
    new URLSearchParams({ To: `+${PHONE_CALLING_CODE}${mobile}`, From: fromNumber, Body: message }),
    { auth: { username: accountSid, password: authToken } }
  );
};

const sendViaMsg91 = async (mobile, message, config) => {
  const { authKey, senderId, route = "4" } = config;
  await axios.get("https://api.msg91.com/api/sendhttp.php", {
    params: { authkey: authKey, mobiles: mobile, message, sender: senderId, route, country: PHONE_CALLING_CODE },
  });
};

const sendViaCustomHttp = async (mobile, message, config) => {
  const { method = "POST", url, headers = {}, bodyTemplate } = config;
  const filledBody = (bodyTemplate || "")
    .replace(/\{\{\s*mobile\s*\}\}/g, mobile)
    .replace(/\{\{\s*message\s*\}\}/g, message);

  let parsedBody = filledBody;
  try {
    parsedBody = JSON.parse(filledBody);
  } catch {
    // not JSON — send as raw text/urlencoded body, that's fine too
  }

  await axios.request({ method, url, headers, data: parsedBody });
};

// General-purpose SMS send — used for OTP (utils/otpProvider.js) and for
// critical event fallbacks like booking-confirmed (SRS-08.2). Falls back to
// logging if no provider is configured, so the app keeps working in dev
// without a real vendor wired up.
const sendSms = async (mobile, message) => {
  const { provider, config } = await getConfig();

  switch (provider) {
    case "twilio":
      return sendViaTwilio(mobile, message, config);
    case "msg91":
      return sendViaMsg91(mobile, message, config);
    case "custom_http":
      return sendViaCustomHttp(mobile, message, config);
    default:
      console.log(`[SMS:console] ${mobile} -> ${message}`);
  }
};

// A short outbound message, distinct from an OTP send, so a misconfigured
// provider or bad credentials surface immediately with the actual error
// instead of a generic failure — used by the Settings page's "test" button.
const sendTestSms = async (mobile, provider, config) => {
  const message = "This is a test message from ShareTruck — your SMS provider is configured correctly.";
  switch (provider) {
    case "twilio":
      return sendViaTwilio(mobile, message, config);
    case "msg91":
      return sendViaMsg91(mobile, message, config);
    case "custom_http":
      return sendViaCustomHttp(mobile, message, config);
    default:
      console.log(`[SMS:console] ${mobile} -> ${message}`);
  }
};

module.exports = { sendSms, sendTestSms, getConfig, setConfig, SMS_PROVIDER_FIELDS };
