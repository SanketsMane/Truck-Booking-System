module.exports = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  OTP_RESEND_COOLDOWN_SECONDS: 30,
  OTP_MAX_REQUESTS_PER_WINDOW: 5,
  OTP_REQUEST_WINDOW_MINUTES: 60,
  OTP_MAX_VERIFY_ATTEMPTS: 5,
  OTP_LOCKOUT_MINUTES: 30,
  JWT_EXPIRES_IN: "30d",
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_RESET_EXPIRY_MINUTES: 30,
  // Mobile bearer-token pair (web keeps the single 30-day cookie JWT above,
  // untouched) — a short-lived access token limits a leaked-token's blast
  // radius, backed by a long-lived, per-device, DB-revocable refresh token
  // (backend/models/refreshTokenModel.js) instead of one shared session.
  ACCESS_TOKEN_EXPIRES_IN: "30m",
  REFRESH_TOKEN_EXPIRES_IN_DAYS: 60,
};
