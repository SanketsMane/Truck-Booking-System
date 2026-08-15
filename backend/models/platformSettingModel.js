const mongoose = require("mongoose");

// One provider integration's config — credentials live in encryptedConfig
// (AES-256-GCM via utils/crypto.js), never in a plaintext field. See
// utils/smsProvider.js / utils/emailProvider.js for the provider-specific
// shape encryptedConfig decrypts to.
const integrationSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "console" },
    encryptedConfig: { type: String },
    updatedAt: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

// Single well-known document — the admin-level toggles referenced by
// SRS-02.3 ("configurable... to block booking confirmation for unverified
// shippers and to block trip publishing for unverified transporters/trucks"),
// plus the admin-configurable SMS/email provider credentials.
const platformSettingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },

    verificationGateEnabled: {
      type: Boolean,
      default: true,
    },

    // Admin-configurable branding — surfaced publicly via GET /meta/branding
    // and mirrored into an in-memory cache (utils/brandingCache.js) for the
    // backend's own synchronous call sites (email/SMS/push copy). logoUrl/
    // faviconUrl hold a /files/:id URL from the existing upload pipeline
    // (isPublic:true), not the file itself.
    platformName: { type: String, trim: true, default: "ShareTruck" },
    logoUrl: { type: String, trim: true, default: "" },
    faviconUrl: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    contactMobile: { type: String, trim: true, default: "" },

    sms: { type: integrationSchema, default: () => ({ provider: "console" }) },
    email: { type: integrationSchema, default: () => ({ provider: "console" }) },
    razorpay: { type: integrationSchema, default: () => ({ provider: "none" }) },
    // "manual" — the existing upload-then-admin-queue flow — until an
    // admin configures a real KYC vendor. See utils/kycProvider.js.
    kyc: { type: integrationSchema, default: () => ({ provider: "manual" }) },
    // "manual" — the existing admin-transfers-then-marks-paid flow —
    // until an admin configures a real payout rail. See utils/payoutProvider.js.
    payout: { type: integrationSchema, default: () => ({ provider: "manual" }) },

    // Platform's cut of each completed booking, applied in
    // bookingController.confirmDrop — the rest goes to the transporter's
    // wallet. Admin-editable via PUT /admin/settings/commission.
    commissionPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true, _id: false }
);

platformSettingSchema.statics.getSettings = async function () {
  let settings = await this.findById("global");
  if (!settings) {
    settings = await this.create({ _id: "global" });
  }
  return settings;
};

const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);

module.exports = PlatformSetting;
