const PlatformSetting = require("../models/platformSettingModel");

// A signup/login OTP that can't actually reach the user's inbox is worse
// than an honest error — without this, requestOtp responds 200 "OTP sent"
// even when nothing was delivered (it's only ever logged to the server
// console — see utils/emailProvider.js). Pure decision logic, kept
// separate from the env/DB reads below so it's unit-testable without
// touching either.
//
// The seed admin is exempted deliberately: they have no password by
// default (see scripts/seedAdmin.js), so OTP is their only way in, and
// they're the one who needs to log in to configure a real provider in the
// first place — blocking them would be a bootstrap deadlock, not safety.
const isOtpBlocked = ({ email, nodeEnv, seedAdminEmail, emailProviderConfigured }) => {
  if (nodeEnv !== "production") return false;
  if (seedAdminEmail && email === seedAdminEmail) return false;
  return !emailProviderConfigured;
};

// Gathers the real inputs (current env, current PlatformSetting) and
// applies the same decision — what authController.requestOtp actually
// calls.
const shouldBlockUnconfiguredOtp = async (email) => {
  const settings = await PlatformSetting.getSettings();
  return isOtpBlocked({
    email,
    nodeEnv: process.env.NODE_ENV,
    seedAdminEmail: (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase(),
    emailProviderConfigured: (settings.email?.provider || "console") !== "console",
  });
};

module.exports = { shouldBlockUnconfiguredOtp, isOtpBlocked };
