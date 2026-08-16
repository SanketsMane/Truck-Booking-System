const emailProvider = require("./emailProvider");
const { otpEmail } = require("../emailTemplates/templates");
const { OTP_EXPIRY_MINUTES } = require("../config/authConfig");

// Thin wrapper over the general email provider (utils/emailProvider.js),
// which reads its vendor + credentials from PlatformSetting — configured
// through the admin Settings page rather than env vars, so it can be set up
// after deployment without a code change or redeploy.
const sendOtp = async (email, otp) => {
  const { subject, html } = otpEmail({ otp, expiryMinutes: OTP_EXPIRY_MINUTES });
  await emailProvider.sendEmail({ to: email, subject, html });
};

module.exports = { sendOtp };
