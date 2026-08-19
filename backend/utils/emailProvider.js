const axios = require("axios");
const PlatformSetting = require("../models/platformSettingModel");
const { encrypt, decrypt } = require("./crypto");
const { renderEmail, escapeHtml } = require("../emailTemplates/base");
const { getBrandName } = require("./brandingCache");

// Resend only, by design — no SMTP/other-vendor option. "console" remains
// as the internal not-yet-configured fallback (see logToConsole), not a
// second real provider choice.
const EMAIL_PROVIDER_FIELDS = {
  console: [],
  resend: ["apiKey", "fromAddress", "fromName"],
};

const RESEND_API_URL = "https://api.resend.com/emails";

const getConfig = async () => {
  const settings = await PlatformSetting.getSettings();
  const provider = settings.email?.provider || "console";
  if (!settings.email?.encryptedConfig) return { provider, config: {} };
  try {
    return { provider, config: JSON.parse(decrypt(settings.email.encryptedConfig)) };
  } catch {
    return { provider, config: {} };
  }
};

const setConfig = async (provider, config, adminId) => {
  const settings = await PlatformSetting.getSettings();
  settings.email = {
    provider,
    encryptedConfig: encrypt(JSON.stringify(config)),
    updatedAt: new Date(),
    updatedBy: adminId,
  };
  await settings.save();
};

const formatFrom = (config) => (config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress);

// Resend's HTTP API — a single POST, no SDK needed (same "call the vendor's
// REST API directly with axios" convention smsProvider.js's Twilio/MSG91
// paths already use rather than pulling in per-vendor SDKs).
const sendViaResend = async ({ to, subject, html, config }) => {
  try {
    await axios.post(
      RESEND_API_URL,
      { from: formatFrom(config), to: [to], subject, html },
      { headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Resend's error body (e.g. {"name":"validation_error","message":"..."})
    // is far more actionable than axios's generic "Request failed with
    // status code 4xx" — surface it so a bad API key/unverified domain
    // shows up clearly in the Settings page's test-email toast instead of
    // a meaningless status code.
    const vendorMessage = error.response?.data?.message;
    throw new Error(vendorMessage ? `Resend: ${vendorMessage}` : error.message);
  }
};

// Falls back to logging if unconfigured/console — this is the only way to
// see a reset/verification link locally before a real provider is
// configured, same role the SMS console fallback plays for OTPs.
const logToConsole = (to, subject, html) => {
  // Strip tags for a readable one-liner, but keep link URLs (stripping tags
  // alone would silently drop them).
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const suffix = links.length ? ` [links: ${links.join(", ")}]` : "";
  console.log(`[EMAIL:console] to=${to} subject="${subject}" -> ${plain}${suffix}`);
};

// General-purpose transactional email — Resend's API, configured through
// the admin Settings page. Falls back to console logging until it is.
const sendEmail = async ({ to, subject, html }) => {
  const { provider, config } = await getConfig();

  switch (provider) {
    case "resend":
      return sendViaResend({ to, subject, html, config });
    default:
      return logToConsole(to, subject, html);
  }
};

const sendTestEmail = async (to, provider, config) => {
  const brand = getBrandName();
  const subject = `${brand} test email`;
  const html = renderEmail({
    title: "Test email",
    preheader: `Your ${brand} email provider is configured correctly.`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi there,</p>
      <p style="margin:0;">This is a test email from ${escapeHtml(brand)} — your email provider is configured correctly.</p>
    `,
  });

  switch (provider) {
    case "resend":
      return sendViaResend({ to, subject, html, config });
    default:
      return logToConsole(to, subject, html);
  }
};

module.exports = { sendEmail, sendTestEmail, getConfig, setConfig, EMAIL_PROVIDER_FIELDS };
