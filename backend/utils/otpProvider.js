const smsProvider = require("./smsProvider");

// Thin wrapper over the general SMS provider (utils/smsProvider.js), which
// reads its vendor + credentials from PlatformSetting — configured through
// the admin Settings page rather than env vars, so it can be set up after
// deployment without a code change or redeploy.
const sendOtp = async (mobile, otp) => {
  await smsProvider.sendSms(mobile, `Your ShareTruck OTP is ${otp}. It expires shortly — do not share this code.`);
};

module.exports = { sendOtp };
