// Production-safe bootstrap seeder: creates (or updates) the first full-
// scope admin account and makes sure the PlatformSetting singleton exists
// with sane defaults. Idempotent — safe to run on every deploy, never
// deletes or overwrites unrelated data (plain upsert-by-email).
//
// Usage: node scripts/seedAdmin.js
//
// Configure via env vars (set these as real Render/production env vars —
// don't rely on the dev fallbacks below for a real deployment):
//   SEED_ADMIN_EMAIL   — defaults to the dev placeholder
//   SEED_ADMIN_MOBILE  — optional, defaults to unset
//   SEED_ADMIN_NAME    — defaults to "Admin"
//
// Login is email + OTP (or email + password, once one is set) like every
// other account — this app has no separate admin login. Use SEED_ADMIN_EMAIL
// with the real OTP delivered to that inbox (or MASTER_OTP in
// non-production environments only).

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({
  path: path.join(__dirname, "..", process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"),
});

const mongoose = require("mongoose");
const User = require("../models/userModel");
const PlatformSetting = require("../models/platformSettingModel");

const DEV_FALLBACK_EMAIL = "contactsanket1@gmail.com";

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || DEV_FALLBACK_EMAIL).trim().toLowerCase();
const ADMIN_MOBILE = process.env.SEED_ADMIN_MOBILE || undefined;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";

(async () => {
  if (!process.env.MONGODB_URL) {
    console.error("MONGODB_URL is not set — nothing to connect to.");
    process.exit(1);
  }

  // A real deploy running with the placeholder dev email almost certainly
  // means SEED_ADMIN_EMAIL was never actually set — that inbox belongs to
  // the developer, not this deployment, so the admin account would be
  // unreachable in any sense that matters for that deployment's owner. Fail
  // loudly instead of quietly creating an account nobody expects to use.
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_EMAIL) {
    console.error(
      "\nRefusing to seed — NODE_ENV=production but SEED_ADMIN_EMAIL is unset.\n" +
        "Set SEED_ADMIN_EMAIL (and SEED_ADMIN_MOBILE / SEED_ADMIN_NAME) to your own\n" +
        "real details before seeding a production database.\n"
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const update = {
    $set: {
      name: ADMIN_NAME,
      isAdmin: true,
      adminScope: "full",
      emailVerified: true,
      status: "active",
    },
  };
  if (ADMIN_MOBILE) update.$set.mobile = ADMIN_MOBILE;

  const admin = await User.findOneAndUpdate({ email: ADMIN_EMAIL }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  // getSettings() would lazily create this on first access anyway — doing
  // it explicitly here means the very first real admin request doesn't
  // race to create it, and the seeder's output is a complete, auditable
  // record of what a fresh deployment starts with.
  const settings = await PlatformSetting.getSettings();

  console.log("Admin user ready:");
  console.log(`  email:      ${admin.email}`);
  console.log(`  mobile:     ${admin.mobile || "(not set)"}`);
  console.log(`  isAdmin:    ${admin.isAdmin}`);
  console.log(`  adminScope: ${admin.adminScope}`);
  console.log("\nPlatform settings ready:");
  console.log(`  verificationGateEnabled: ${settings.verificationGateEnabled}`);
  console.log(`  commissionPercent:       ${settings.commissionPercent}`);
  console.log("\nLog in at /login with this email and a real OTP");
  console.log("(or MASTER_OTP, in non-production environments only).");

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Failed to seed:", err);
  process.exit(1);
});
