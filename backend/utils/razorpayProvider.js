const crypto = require("crypto");
const Razorpay = require("razorpay");
const PlatformSetting = require("../models/platformSettingModel");
const { encrypt, decrypt } = require("./crypto");

// Same getConfig/setConfig shape as smsProvider.js/emailProvider.js, against
// PlatformSetting.razorpay instead of .sms/.email — keeps Razorpay
// credentials encrypted at rest the same way every other provider secret is.
const RAZORPAY_CONFIG_FIELDS = {
  none: [],
  razorpay: ["keyId", "keySecret", "webhookSecret"],
};

const getConfig = async () => {
  const settings = await PlatformSetting.getSettings();
  const provider = settings.razorpay?.provider || "none";
  if (!settings.razorpay?.encryptedConfig) return { provider, config: {} };
  try {
    return { provider, config: JSON.parse(decrypt(settings.razorpay.encryptedConfig)) };
  } catch {
    return { provider, config: {} };
  }
};

const setConfig = async (provider, config, adminId) => {
  const settings = await PlatformSetting.getSettings();
  settings.razorpay = {
    provider,
    encryptedConfig: encrypt(JSON.stringify(config)),
    updatedAt: new Date(),
    updatedBy: adminId,
  };
  await settings.save();
};

// Built fresh on every call (not cached across requests) so a credential
// rotation in the Settings UI takes effect immediately, same "test what's
// actually live" principle as smsProvider's test path.
const getClient = async () => {
  const { provider, config } = await getConfig();
  if (provider !== "razorpay" || !config.keyId || !config.keySecret) {
    throw new Error("Razorpay isn't configured yet — save your Key ID and Key Secret in admin Settings first");
  }
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
};

const getWebhookSecret = async () => {
  const { config } = await getConfig();
  return config.webhookSecret || "";
};

// Razorpay's API works in the smallest currency unit (paise for INR) —
// converting in exactly one place keeps every other caller in plain rupees,
// matching the rest of this app's Number-of-rupees convention
// (Booking.priceEstimate, Trip.pricePerTon, etc).
const toPaise = (rupees) => Math.round(rupees * 100);
const fromPaise = (paise) => paise / 100;

// Constant-time comparison of two HMAC hex digests — a plain === would leak
// timing information about how many leading bytes matched. Length-checked
// first since timingSafeEqual throws (rather than returning false) on
// differently-sized buffers.
const safeEqual = (a, b) => {
  const bufA = Buffer.from(a || "", "utf8");
  const bufB = Buffer.from(b || "", "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// Checkout callback verification — Razorpay's documented scheme is
// HMAC_SHA256(order_id + "|" + payment_id, key_secret).
const verifyPaymentSignature = ({ orderId, paymentId, signature, keySecret }) => {
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
};

// Webhook verification — HMAC_SHA256 over the exact raw request body,
// checked against the x-razorpay-signature header.
const verifyWebhookSignature = ({ rawBody, signature, webhookSecret }) => {
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
};

module.exports = {
  getConfig,
  setConfig,
  getClient,
  getWebhookSecret,
  toPaise,
  fromPaise,
  verifyPaymentSignature,
  verifyWebhookSignature,
  RAZORPAY_CONFIG_FIELDS,
};
