const nodemailer = require("nodemailer");
const PlatformSetting = require("../models/platformSettingModel");
const { encrypt, decrypt } = require("./crypto");

const EMAIL_PROVIDER_FIELDS = {
  console: [],
  smtp: ["host", "port", "secure", "user", "pass", "fromAddress", "fromName"],
};

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

const buildTransport = (config) =>
  nodemailer.createTransport({
    host: config.host,
    port: Number(config.port) || 587,
    secure: Boolean(config.secure),
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });

// General-purpose transactional email — works with any SMTP-capable vendor
// (Gmail, SES, SendGrid, Mailgun, etc. all offer an SMTP relay), configured
// through the admin Settings page. Falls back to logging if unconfigured.
const sendEmail = async ({ to, subject, html }) => {
  const { provider, config } = await getConfig();

  if (provider !== "smtp") {
    // Strip tags for a readable one-liner, but keep link URLs (stripping
    // tags alone would silently drop them) — this is the only way to see a
    // reset/verification link locally before a real SMTP provider is
    // configured, same role the SMS console fallback plays for OTPs.
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const suffix = links.length ? ` [links: ${links.join(", ")}]` : "";
    console.log(`[EMAIL:console] to=${to} subject="${subject}" -> ${plain}${suffix}`);
    return;
  }

  const transport = buildTransport(config);
  await transport.sendMail({
    from: config.fromName ? `"${config.fromName}" <${config.fromAddress}>` : config.fromAddress,
    to,
    subject,
    html,
  });
};

const sendTestEmail = async (to, provider, config) => {
  if (provider !== "smtp") {
    console.log(`[EMAIL:console] test email to=${to}`);
    return;
  }
  const transport = buildTransport(config);
  await transport.sendMail({
    from: config.fromName ? `"${config.fromName}" <${config.fromAddress}>` : config.fromAddress,
    to,
    subject: "ShareTruck test email",
    html: "<p>This is a test email from ShareTruck — your email provider is configured correctly.</p>",
  });
};

module.exports = { sendEmail, sendTestEmail, getConfig, setConfig, EMAIL_PROVIDER_FIELDS };
