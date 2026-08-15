const PlatformSetting = require("../models/platformSettingModel");

// SMS/email provider credentials live in PlatformSetting (DB-configured
// from the admin Settings page), not env vars — so unlike validateEnv.js,
// this can't run at module-load time before the DB is even connected. Both
// providers default to "console" (log-only, see utils/smsProvider.js /
// emailProvider.js), which is fine for local dev but means a fresh
// production deploy can have OTP/email silently never reaching a real user
// until an admin visits Settings — a warning, not a boot failure, since an
// admin's own very first login is itself gated on this same OTP flow.
const checkNotificationProviders = async () => {
  if (process.env.NODE_ENV !== "production") return;

  try {
    const settings = await PlatformSetting.getSettings();
    const unconfigured = [];
    if ((settings.sms?.provider || "console") === "console") unconfigured.push("SMS");
    if ((settings.email?.provider || "console") === "console") unconfigured.push("email");

    if (unconfigured.length) {
      console.warn(
        `\n[checkProviders] WARNING: ${unconfigured.join(" and ")} provider${
          unconfigured.length > 1 ? "s are" : " is"
        } not configured — OTPs and notifications are only being logged to this console, not delivered to real ` +
          "users. Configure a real provider from the admin Settings page.\n"
      );
    }
  } catch (error) {
    console.error("[checkProviders] failed to check notification provider configuration:", error.message);
  }
};

module.exports = checkNotificationProviders;
