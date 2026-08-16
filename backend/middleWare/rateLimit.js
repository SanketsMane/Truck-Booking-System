const rateLimit = require("express-rate-limit");

// Baseline anti-abuse limiter for every route. OTP endpoints have their own
// tighter, per-email logic in authController — this is a coarser per-IP
// backstop for everything else (search scraping, upload spam, etc.),
// deliberately generous so real usage never hits it.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, msg: "Too many requests — please slow down and try again shortly." },
});

// File uploads are disk-write + processing heavy and easy to spam.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, msg: "Too many uploads — please slow down and try again shortly." },
});

// Password login has no per-account lockout the way OTP does (no attempt
// counter stored on the user), so this per-IP limiter is what actually
// stops brute-forcing a password guess.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, msg: "Too many attempts — please slow down and try again shortly." },
});

// request-otp's own per-account cooldown/window (authController.requestOtp)
// only throttles repeats of the exact same email string — it does nothing
// against a script that requests OTPs for many different addresses (e.g.
// spamming one real inbox via Gmail's dot/plus-tag aliasing, which each
// look like a brand-new account with a fresh cooldown). authLimiter's
// 20/15min budget is too loose to catch a slow, deliberate drip; this caps
// it at the per-IP level regardless of which email string each request
// uses. verify-otp gets the same limiter — it's the only thing standing
// between a script and a 6-digit brute force at the network level (the
// per-account verifyAttempts lockout is the other layer).
//
// Skipped in tests: the MASTER_OTP-based signupUser() test helper (see
// tests/helpers.js) drives this exact pair of routes dozens of times per
// spec file — a real per-IP cap here isn't testing anything about that
// helper, just tripping over it.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, msg: "Too many attempts — please slow down and try again shortly." },
});

module.exports = { apiLimiter, uploadLimiter, authLimiter, otpLimiter };
