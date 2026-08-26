const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendServerError = require("../utils/sendServerError");

const User = require("../models/userModel");
const Verification = require("../models/verificationModel");
const RefreshToken = require("../models/refreshTokenModel");
const otpProvider = require("../utils/otpProvider");
const emailProvider = require("../utils/emailProvider");
const { shouldBlockUnconfiguredOtp } = require("../utils/notificationGuard");
const { welcomeEmail, passwordResetEmail } = require("../emailTemplates/templates");
const {
  requestOtpValidation,
  verifyOtpValidation,
  addRoleValidation,
  updateProfileValidation,
  signupValidation,
  loginPasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  setPasswordValidation,
  mobileRefreshTokenValidation,
} = require("../validators/authValidation");
const {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_REQUESTS_PER_WINDOW,
  OTP_REQUEST_WINDOW_MINUTES,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_LOCKOUT_MINUTES,
  JWT_EXPIRES_IN,
  PASSWORD_RESET_EXPIRY_MINUTES,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
} = require("../config/authConfig");

const saltRounds = 10;
// secure:true everywhere except the automated-test environment. Real
// browsers (including local dev, where the frontend/backend split across
// ports 5173/3000 makes this a cross-origin cookie) treat "localhost" as a
// secure context and both set and send this cookie correctly despite plain
// HTTP — verified throughout this project's manual/Playwright testing — so
// "development" must keep secure:true; changing that would break real
// login there (Chrome rejects SameSite=None cookies outright if Secure is
// missing, regardless of origin trust). Only NODE_ENV=test is exempted:
// that mode is exclusively driven by supertest's in-process HTTP client
// (never a real browser), whose cookie jar enforces Secure literally by
// request protocol and would otherwise silently drop the cookie on every
// request after login.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "test",
  sameSite: "none",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  return Math.floor(min + Math.random() * (max - min)).toString();
};

const issueSession = (res, user) => {
  const token = jwt.sign(
    { id: user._id, roles: user.roles, isAdmin: user.isAdmin, sessionVersion: user.sessionVersion },
    process.env.SECRET_KEY,
    { expiresIn: JWT_EXPIRES_IN }
  );
  res.cookie("token", token, COOKIE_OPTIONS);
};

// The mobile app can't rely on the httpOnly cookie the way a browser does
// (no shared cookie jar on RN's networking stack) — it identifies itself
// with this header on every login/signup call so those handlers know to
// ALSO hand back a bearer-token pair in the JSON body, alongside (not
// instead of) issueSession's cookie, which stays harmless-but-unused for a
// mobile client.
const isMobileClient = (req) => req.headers["x-client-type"] === "mobile";

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, roles: user.roles, isAdmin: user.isAdmin, sessionVersion: user.sessionVersion },
    process.env.SECRET_KEY,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

// Issues a short-lived access token plus a long-lived, per-device refresh
// token (a new RefreshToken row — see that model's own comment for why this
// is what makes real per-device "log out of just my phone" possible, unlike
// the single sessionVersion scalar the cookie session relies on). The raw
// refresh token is returned to the caller and NEVER stored — only its hash
// is, same principle as password hashing.
const issueMobileTokens = async (user, req) => {
  const accessToken = signAccessToken(user);
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    deviceId: req.body.deviceId,
    deviceInfo: req.body.deviceInfo,
    platform: req.body.platform,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

const publicProfile = (user) => ({
  id: user._id,
  email: user.email,
  emailVerified: user.emailVerified,
  mobile: user.mobile,
  name: user.name,
  city: user.city,
  profilePhoto: user.profilePhoto,
  roles: user.roles,
  isAdmin: user.isAdmin,
  adminScope: user.adminScope,
  status: user.status,
  notificationPreferences: user.notificationPreferences,
  hasPassword: Boolean(user.passwordHash),
  createdAt: user.createdAt,
  // SRS-09.1 — profile display includes rating and join-date summary.
  ratingAvg: user.ratingAvg,
  ratingCount: user.ratingCount,
});

// Matches the same "not locked-out, cooldown elapsed" state that used to be
// checked against a single earlier read of `user.otp` — but as a Mongo
// filter, evaluated fresh at the instant of an atomic write (see requestOtp
// below) rather than against a snapshot that a concurrent request could
// have already invalidated. lockedUntil/lastSentAt being absent or null (a
// brand-new user, or one whose lock/cooldown was cleared by a successful
// verify) counts as passing, same as the old `otpState.lockedUntil && ...`
// / `otpState.lastSentAt && ...` truthiness checks did.
const otpGateFilter = (email, now) => ({
  email,
  $and: [
    { $or: [{ "otp.lockedUntil": { $exists: false } }, { "otp.lockedUntil": null }, { "otp.lockedUntil": { $lte: now } }] },
    {
      $or: [
        { "otp.lastSentAt": { $exists: false } },
        { "otp.lastSentAt": null },
        { "otp.lastSentAt": { $lte: new Date(now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000) } },
      ],
    },
  ],
});

// Reached only when a concurrent requestOtp call for the same email beat
// this one to the atomic write in otpGateFilter's caller — re-reads
// whatever that other call actually committed and reports the same 429 this
// request would have gotten had it read that state to begin with, instead
// of a stale "success" for an OTP that the DB no longer holds.
const respondWithLiveOtpGateState = async (res, email, now) => {
  const current = await User.findOne({ email });
  const otpState = (current && current.otp) || {};

  if (otpState.lockedUntil && otpState.lockedUntil > now) {
    return res.status(429).json({
      success: false,
      msg: `Too many attempts. Try again after ${otpState.lockedUntil.toISOString()}`,
    });
  }

  if (otpState.lastSentAt && now - otpState.lastSentAt < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - otpState.lastSentAt)) / 1000
    );
    return res.status(429).json({
      success: false,
      msg: `Please wait ${waitSeconds}s before requesting another OTP`,
    });
  }

  // The gate that blocked our write a moment ago has since cleared again
  // (e.g. a third request's lock/cooldown expired in the intervening
  // milliseconds) — vanishingly unlikely in practice. Ask the caller to
  // retry rather than fabricate a response for state that's already stale
  // a second time.
  return res.status(429).json({
    success: false,
    msg: "Please try again in a moment.",
  });
};

// Request OTP (signup or login — same entry point per FR-01.1)
const requestOtp = async (req, res) => {
  try {
    const { error } = requestOtpValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const email = req.body.email.trim().toLowerCase();

    if (await shouldBlockUnconfiguredOtp(email)) {
      return res.status(503).json({
        success: false,
        msg: "Sign-in is temporarily unavailable while the platform finishes setup — please try again shortly.",
      });
    }

    const now = new Date();

    // Read purely to tell a brand-new signup apart from an existing account
    // and (for an existing one) to compute the next requestCount/
    // requestWindowStart — this snapshot can go stale under concurrency,
    // but the write below re-checks the lockout/cooldown state atomically
    // rather than trusting it (see otpGateFilter).
    let user = await User.findOne({ email });

    if (!user) {
      // First-ever request for this brand-new email — nothing to race
      // against except a concurrent signup for the exact same address,
      // which the email unique index (userModel.js) already guards. If we
      // lose that race, fall through to the normal existing-user path below
      // using whatever the winner created.
      const otp = generateOtp();
      const codeHash = await bcrypt.hash(otp, saltRounds);
      try {
        await User.create({
          email,
          otp: {
            codeHash,
            expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
            verifyAttempts: 0,
            requestCount: 1,
            requestWindowStart: now,
            lastSentAt: now,
          },
        });

        await otpProvider.sendOtp(email, otp);

        return res.status(200).json({
          success: true,
          msg: "OTP sent",
          expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
        });
      } catch (createErr) {
        if (createErr.code !== 11000) throw createErr;
        user = await User.findOne({ email });
        if (!user) throw createErr;
      }
    }

    const otpState = user.otp || {};

    if (otpState.lockedUntil && otpState.lockedUntil > now) {
      return res.status(429).json({
        success: false,
        msg: `Too many attempts. Try again after ${otpState.lockedUntil.toISOString()}`,
      });
    }

    if (otpState.lastSentAt && now - otpState.lastSentAt < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const waitSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - otpState.lastSentAt)) / 1000
      );
      return res.status(429).json({
        success: false,
        msg: `Please wait ${waitSeconds}s before requesting another OTP`,
      });
    }

    let { requestCount = 0, requestWindowStart } = otpState;
    if (!requestWindowStart || now - requestWindowStart > OTP_REQUEST_WINDOW_MINUTES * 60 * 1000) {
      requestWindowStart = now;
      requestCount = 0;
    }
    requestCount += 1;

    // Everything from here on used to be a plain user.save() against the
    // `user` fetched above — but that document may already be stale (a
    // second concurrent request for the same email could have read the
    // identical snapshot and be about to write too). Both writes below are
    // atomic findOneAndUpdate calls whose FILTER re-checks the lockout/
    // cooldown conditions against the database at the instant of the write,
    // not against the earlier read. MongoDB serializes writes to a single
    // document, so even truly-simultaneous callers are still totally
    // ordered: whichever commits first makes every later racer's filter
    // fail, and a failed filter means that racer sends nothing and reports
    // the real (now-current) 429 instead of a false "success". Only the
    // requestCount/requestWindowStart bookkeeping itself keeps a small
    // residual race (worst case: OTP_MAX_REQUESTS_PER_WINDOW enforcement is
    // occasionally off by one under true concurrency) — far lower stakes
    // than the codeHash lost-update bug this closes.
    if (requestCount > OTP_MAX_REQUESTS_PER_WINDOW) {
      const lockedUntil = new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60 * 1000);
      const locked = await User.findOneAndUpdate(otpGateFilter(email, now), { $set: { "otp.lockedUntil": lockedUntil } });
      if (!locked) {
        return respondWithLiveOtpGateState(res, email, now);
      }
      return res.status(429).json({
        success: false,
        msg: "Too many OTP requests. Try again later.",
      });
    }

    const otp = generateOtp();
    const codeHash = await bcrypt.hash(otp, saltRounds);

    const updated = await User.findOneAndUpdate(otpGateFilter(email, now), {
      $set: {
        "otp.codeHash": codeHash,
        "otp.expiresAt": new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
        "otp.verifyAttempts": 0,
        "otp.requestCount": requestCount,
        "otp.requestWindowStart": requestWindowStart,
        "otp.lastSentAt": now,
      },
      $unset: { "otp.lockedUntil": "" },
    });

    if (!updated) {
      return respondWithLiveOtpGateState(res, email, now);
    }

    await otpProvider.sendOtp(email, otp);

    res.status(200).json({
      success: true,
      msg: "OTP sent",
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Shared by verifyOtp (the real, account-creating/session-issuing call) and
// checkOtp (a read-mostly "is this code currently right?" check used by
// Signup.jsx's inline "Verify email" step — see checkOtp's own comment for
// why that step must NOT itself create the account). A wrong guess counts
// as an attempt either way, so both endpoints share the same
// attempt-counting/lockout write, not two independent budgets.
const checkOtpCode = async (user, otp, now) => {
  if (!user || !user.otp || !user.otp.codeHash) {
    return { ok: false, status: 400, msg: "Request an OTP first" };
  }

  if (user.otp.lockedUntil && user.otp.lockedUntil > now) {
    return {
      ok: false,
      status: 429,
      msg: `Too many attempts. Try again after ${user.otp.lockedUntil.toISOString()}`,
    };
  }

  if (!user.otp.expiresAt || user.otp.expiresAt < now) {
    return { ok: false, status: 400, msg: "OTP expired — request a new one" };
  }

  // TEMPORARY: a fixed master OTP that bypasses the real code, for easier
  // manual testing before real SMS credentials are configured. Only active
  // when MASTER_OTP is set — remove this block (and the env var) before
  // going live with real users.
  const isMasterOtp = Boolean(process.env.MASTER_OTP) && otp === process.env.MASTER_OTP;
  if (isMasterOtp) {
    console.warn(`[MASTER_OTP] Bypassed real OTP check for ${user.email}`);
  }

  const isMatch = isMasterOtp || (await bcrypt.compare(otp, user.otp.codeHash));
  if (!isMatch) {
    user.otp.verifyAttempts = (user.otp.verifyAttempts || 0) + 1;
    if (user.otp.verifyAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      user.otp.lockedUntil = new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60 * 1000);
      user.otp.verifyAttempts = 0;
    }
    await user.save();
    return { ok: false, status: 400, msg: "Invalid OTP" };
  }

  return { ok: true };
};

// Confirms an OTP is currently correct WITHOUT creating an account, issuing
// a session, or consuming/clearing the code (verifyOtp below still does all
// of that for real) — Signup.jsx's password-based form uses this for its
// "Verify" button so it can give the user server-confirmed proof their code
// is right before they fill in the rest of the form, without the account
// actually springing into existence at that click. The account itself is
// only ever created when they submit the full form (name/mobile/password),
// which calls the real verifyOtp immediately followed by setPassword — see
// Signup.jsx's handleSubmit.
const checkOtp = async (req, res) => {
  try {
    const { error } = verifyOtpValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { otp } = req.body;
    const email = req.body.email.trim().toLowerCase();
    const now = new Date();

    const user = await User.findOne({ email });
    const result = await checkOtpCode(user, otp, now);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, msg: result.msg });
    }

    res.status(200).json({ success: true, msg: "OTP verified" });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Verify OTP — completes signup for a new email, or logs in an existing one
const verifyOtp = async (req, res) => {
  try {
    const { error } = verifyOtpValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { otp, name, mobile, city, roles } = req.body;
    const email = req.body.email.trim().toLowerCase();
    const now = new Date();

    const user = await User.findOne({ email }).select("+passwordHash");
    const check = await checkOtpCode(user, otp, now);
    if (!check.ok) {
      return res.status(check.status).json({ success: false, msg: check.msg });
    }

    // loginPassword already blocks a suspended/banned account at login —
    // this path (login OR signup-completion) skipped that check entirely,
    // so a banned user could still get a valid session by logging in via
    // OTP instead of a password.
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        msg: user.status === "banned" ? "This account has been banned" : "This account has been suspended",
      });
    }

    if (!user.emailVerified && !name && !user.name) {
      return res.status(400).json({ success: false, msg: "Name is required to complete signup" });
    }
    if (!user.emailVerified && !mobile && !user.mobile) {
      return res.status(400).json({ success: false, msg: "Mobile number is required to complete signup" });
    }

    if (name) user.name = name;
    if (mobile && mobile !== user.mobile) {
      const mobileTaken = await User.findOne({ mobile, _id: { $ne: user._id } });
      if (mobileTaken) {
        return res.status(409).json({ success: false, msg: "That mobile number is already in use by another account" });
      }
      user.mobile = mobile;
    }
    if (city) user.city = city;
    if (roles && roles.length) {
      user.roles = Array.from(new Set([...(user.roles || []), ...roles]));
    }

    const isNewSignup = !user.emailVerified;

    user.emailVerified = true;
    user.otp.codeHash = undefined;
    user.otp.expiresAt = undefined;
    user.otp.verifyAttempts = 0;
    user.otp.lockedUntil = undefined;
    await user.save();

    issueSession(res, user);

    if (isNewSignup) {
      const { subject, html } = welcomeEmail({ name: user.name });
      emailProvider.sendEmail({ to: user.email, subject, html }).catch((err) => console.error("[verifyOtp] welcome email failed:", err.message));
    }

    const responseBody = { success: true, msg: "Login successful", user: publicProfile(user) };
    if (isMobileClient(req)) {
      responseBody.tokens = await issueMobileTokens(user, req);
    }
    res.status(200).json(responseBody);
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Add a role (shipper/transporter) to the current account without re-verifying the account
const addRole = async (req, res) => {
  try {
    const { error } = addRoleValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const user = await User.findById(req.auth.id).select("+passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (!user.roles.includes(req.body.role)) {
      user.roles.push(req.body.role);
      await user.save();
    }

    issueSession(res, user);

    res.status(200).json({ success: true, msg: "Role added", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    issueSession(res, user);
    res.status(200).json({ success: true, msg: "Session refreshed" });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Bumping sessionVersion means the cookie being cleared here (or a copy of
// it that leaked/was captured before this call) stops working immediately,
// rather than remaining valid until its natural 30-day expiry.
const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.auth.id, { $inc: { sessionVersion: 1 } });
    res.clearCookie("token", COOKIE_OPTIONS);
    res.status(200).json({ success: true, msg: "Logout successful" });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Exchanges a refresh token for a new access+refresh pair — takes proof of
// possessing the refresh token, not an access token, since the whole point
// is to work even after the short-lived access token has expired. Rotates
// on every call: the presented token is marked revoked (not deleted) and
// pointed at its replacement, so a REUSE of an already-rotated token — the
// legitimate holder should only ever have the newest one — is a real theft
// signal, answered by revoking every other still-live row for that user
// rather than trusting either token further.
const mobileRefresh = async (req, res) => {
  try {
    const { error, value } = mobileRefreshTokenValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const tokenHash = crypto.createHash("sha256").update(value.refreshToken).digest("hex");
    const stored = await RefreshToken.findOne({ tokenHash });
    if (!stored) {
      return res.status(401).json({ success: false, msg: "Invalid session — please log in again" });
    }

    if (stored.revokedAt) {
      await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { $set: { revokedAt: new Date() } });
      return res.status(401).json({ success: false, msg: "Session compromised — please log in again" });
    }

    if (stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, msg: "Session expired — please log in again" });
    }

    const user = await User.findById(stored.user);
    if (!user || user.status !== "active") {
      return res.status(403).json({
        success: false,
        msg: user?.status === "banned" ? "This account has been banned" : "This account has been suspended",
      });
    }

    // Create the replacement BEFORE revoking the presented token — if
    // create() throws, the caller's still-valid token is untouched and they
    // can just retry, instead of being stranded with no valid token at all.
    const newRawToken = crypto.randomBytes(32).toString("hex");
    const newTokenHash = crypto.createHash("sha256").update(newRawToken).digest("hex");
    await RefreshToken.create({
      user: user._id,
      tokenHash: newTokenHash,
      deviceId: stored.deviceId,
      deviceInfo: stored.deviceInfo,
      platform: stored.platform,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000),
    });
    stored.revokedAt = new Date();
    stored.replacedByTokenHash = newTokenHash;
    await stored.save();

    res.status(200).json({
      success: true,
      msg: "Session refreshed",
      tokens: { accessToken: signAccessToken(user), refreshToken: newRawToken },
    });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Revokes just THIS device's refresh token — the real per-device "log out
// of only my phone" logout() itself can't offer, since sessionVersion is a
// single scalar shared by every session. Deliberately doesn't require a
// still-valid access token (proof of holding the refresh token is enough),
// so a device can log out cleanly even after its access token already
// expired. Idempotent and silent on an unknown/already-revoked token — no
// reason to let this endpoint confirm whether a given token was ever valid.
const mobileLogout = async (req, res) => {
  try {
    const { error, value } = mobileRefreshTokenValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const tokenHash = crypto.createHash("sha256").update(value.refreshToken).digest("hex");
    await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } });

    res.status(200).json({ success: true, msg: "Logged out" });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).select("-otp +passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    res.status(200).json({ success: true, user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

const updateProfile = async (req, res) => {
  try {
    const { error } = updateProfileValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const updates = req.body;
    delete updates.roles;
    delete updates.isAdmin;
    delete updates.status;
    // Email is the account's login identity now — changing it here (with no
    // re-verification step) would let a user lock themselves out or, worse,
    // race another account's email. Same treatment mobile used to get when
    // it was the identifier.
    delete updates.email;

    // SRS-09.2 — name is the one field KYC verification actually attests to
    // (it's what's checked against the submitted ID documents), so once any
    // verification has been approved it locks, the same way the SRS expects
    // "verified-identity fields" to. Unlocking it goes through the admin
    // rejecting that verification (existing capability, with a reason) —
    // which both re-opens this field and, per submitVerification, puts the
    // record back in Pending for the user to resubmit. That reject-then-
    // resubmit round trip *is* the "admin-assisted flow that re-triggers
    // verification" the spec asks for, not a separate mechanism.
    if (typeof updates.name === "string") {
      const currentUser = await User.findById(req.auth.id).select("name");
      if (currentUser && updates.name.trim() !== currentUser.name) {
        const hasVerifiedIdentity = await Verification.exists({ user: req.auth.id, status: "verified" });
        if (hasVerifiedIdentity) {
          return res.status(403).json({
            success: false,
            msg: "Your name is locked after verification and matches your approved documents. Contact support to have your verification reopened before changing it.",
          });
        }
      }
    }

    // An empty string means "clear it" — stored as an actually-missing field
    // (via $unset), not "", since mobile's sparse unique index only ignores
    // documents where the field is absent; two users both saving mobile: ""
    // would otherwise collide on that index.
    let unsetMobile = false;
    if (updates.mobile === "") {
      delete updates.mobile;
      unsetMobile = true;
    } else if (updates.mobile) {
      const mobileTaken = await User.findOne({ mobile: updates.mobile, _id: { $ne: req.auth.id } });
      if (mobileTaken) {
        return res.status(409).json({ success: false, msg: "That mobile number is already in use by another account" });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.auth.id,
      unsetMobile ? { $set: updates, $unset: { mobile: "" } } : updates,
      { new: true, runValidators: true }
    ).select("-otp +passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.status(200).json({ success: true, msg: "Profile updated", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Creates a brand-new account with a password. Deliberately does NOT attach
// a password to an existing email match — an unauthenticated endpoint that
// could do that would let anyone "sign up" with an email they don't own and
// take over that account. Adding a password to an existing (e.g. OTP-
// created) account goes through setPassword instead, which requires an
// active session.
const signup = async (req, res) => {
  try {
    const { error } = signupValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { name, password, roles } = req.body;
    const email = req.body.email.trim().toLowerCase();
    const mobile = req.body.mobile || undefined;

    // Only include mobile in the conflict check when one was actually
    // given — an unset $or clause would match every other mobile-less
    // account (mobile: undefined) and false-positive on the very first
    // signup after this one.
    const orConditions = [{ email }];
    if (mobile) orConditions.push({ mobile });
    const existing = await User.findOne({ $or: orConditions });
    if (existing) {
      const field = existing.email === email ? "email" : "mobile number";
      return res.status(409).json({ success: false, msg: `An account with this ${field} already exists` });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      name,
      email,
      mobile,
      passwordHash,
      roles: roles && roles.length ? roles : [],
      emailVerified: false,
    });

    issueSession(res, user);

    const { subject, html } = welcomeEmail({ name: user.name });
    emailProvider.sendEmail({ to: user.email, subject, html }).catch((err) => console.error("[signup] welcome email failed:", err.message));

    const responseBody = { success: true, msg: "Account created", user: publicProfile(user) };
    if (isMobileClient(req)) {
      responseBody.tokens = await issueMobileTokens(user, req);
    }
    res.status(201).json(responseBody);
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Login via email — same account, same session shape as the OTP path, just
// a different way in for users who set a password.
const loginPassword = async (req, res) => {
  try {
    const { error } = loginPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { password } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+passwordHash");

    // Same generic message whether the account doesn't exist or the
    // password is wrong — don't let this endpoint be used to enumerate
    // which emails have accounts.
    if (!user || !user.passwordHash) {
      return res.status(400).json({ success: false, msg: "Incorrect email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, msg: "Incorrect email or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        msg: user.status === "banned" ? "This account has been banned" : "This account has been suspended",
      });
    }

    issueSession(res, user);

    const responseBody = { success: true, msg: "Login successful", user: publicProfile(user) };
    if (isMobileClient(req)) {
      responseBody.tokens = await issueMobileTokens(user, req);
    }
    res.status(200).json(responseBody);
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Always responds the same way regardless of whether the email is on file —
// otherwise this endpoint could be used to check which emails have accounts.
const forgotPassword = async (req, res) => {
  try {
    const { error } = forgotPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.passwordReset = {
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000),
      };
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
      const { subject, html } = passwordResetEmail({
        name: user.name,
        resetUrl,
        expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      });
      emailProvider
        .sendEmail({ to: user.email, subject, html })
        .catch((err) => console.error("[forgotPassword] email send failed:", err.message));
    }

    res.status(200).json({
      success: true,
      msg: "If that email has an account, we've sent a password reset link.",
    });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { error } = resetPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { token, password } = req.body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      "passwordReset.tokenHash": tokenHash,
      "passwordReset.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, msg: "This reset link is invalid or has expired" });
    }

    user.passwordHash = await bcrypt.hash(password, saltRounds);
    user.passwordReset = undefined;
    // Resetting a password is a good moment to also invalidate any other
    // active sessions — the same protection logout() gives.
    user.sessionVersion += 1;
    await user.save();

    issueSession(res, user);

    res.status(200).json({ success: true, msg: "Password reset — you're now logged in", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Lets an already-authenticated user add a password to an OTP-created
// account for the first time, or change an existing one. Requires the
// current password if one is already set.
const setPassword = async (req, res) => {
  try {
    const { error } = setPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.auth.id).select("+passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, msg: "Enter your current password" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, msg: "Current password is incorrect" });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    res.status(200).json({ success: true, msg: "Password updated", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

module.exports = {
  requestOtp,
  checkOtp,
  verifyOtp,
  addRole,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  signup,
  loginPassword,
  forgotPassword,
  resetPassword,
  setPassword,
  mobileRefresh,
  mobileLogout,
};
