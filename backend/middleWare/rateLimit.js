const rateLimit = require("express-rate-limit");

// Baseline anti-abuse limiter for every route. OTP endpoints have their own
// tighter, per-mobile-number logic in authController — this is a coarser
// per-IP backstop for everything else (search scraping, upload spam, etc.),
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

// GPS pings arrive far more often than typical REST calls (~1 per 8s while
// a trip is actively tracked) — the global apiLimiter's 300/15min budget is
// shared across all of a user's traffic and would starve everything else
// if a location pinger ran full-tilt against it alone.
const locationLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, msg: "Too many location updates — slow down." },
});

module.exports = { apiLimiter, uploadLimiter, authLimiter, locationLimiter };
