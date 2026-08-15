const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendServerError = require("../utils/sendServerError");

const User = require("../models/userModel");
const otpProvider = require("../utils/otpProvider");
const emailProvider = require("../utils/emailProvider");
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

const publicProfile = (user) => ({
  id: user._id,
  mobile: user.mobile,
  mobileVerified: user.mobileVerified,
  name: user.name,
  email: user.email,
  city: user.city,
  profilePhoto: user.profilePhoto,
  roles: user.roles,
  isAdmin: user.isAdmin,
  adminScope: user.adminScope,
  status: user.status,
  notificationPreferences: user.notificationPreferences,
  hasPassword: Boolean(user.passwordHash),
  createdAt: user.createdAt,
});

// Request OTP (signup or login — same entry point per FR-01.1)
const requestOtp = async (req, res) => {
  try {
    const { error } = requestOtpValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { mobile } = req.body;
    const now = new Date();

    let user = await User.findOne({ mobile });
    if (!user) {
      user = new User({ mobile });
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

    if (requestCount > OTP_MAX_REQUESTS_PER_WINDOW) {
      user.otp = {
        ...otpState,
        lockedUntil: new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60 * 1000),
      };
      await user.save();
      return res.status(429).json({
        success: false,
        msg: "Too many OTP requests. Try again later.",
      });
    }

    const otp = generateOtp();
    const codeHash = await bcrypt.hash(otp, saltRounds);

    user.otp = {
      codeHash,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
      verifyAttempts: 0,
      requestCount,
      requestWindowStart,
      lastSentAt: now,
      lockedUntil: undefined,
    };
    await user.save();

    await otpProvider.sendOtp(mobile, otp);

    res.status(200).json({
      success: true,
      msg: "OTP sent",
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Verify OTP — completes signup for a new mobile number, or logs in an existing one
const verifyOtp = async (req, res) => {
  try {
    const { error } = verifyOtpValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { mobile, otp, name, email, city, roles } = req.body;
    const now = new Date();

    const user = await User.findOne({ mobile }).select("+passwordHash");
    if (!user || !user.otp || !user.otp.codeHash) {
      return res.status(400).json({ success: false, msg: "Request an OTP first" });
    }

    if (user.otp.lockedUntil && user.otp.lockedUntil > now) {
      return res.status(429).json({
        success: false,
        msg: `Too many attempts. Try again after ${user.otp.lockedUntil.toISOString()}`,
      });
    }

    if (!user.otp.expiresAt || user.otp.expiresAt < now) {
      return res.status(400).json({ success: false, msg: "OTP expired — request a new one" });
    }

    // TEMPORARY: a fixed master OTP that bypasses the real code, for easier
    // manual testing before real SMS credentials are configured. Only active
    // when MASTER_OTP is set — remove this block (and the env var) before
    // going live with real users.
    const isMasterOtp = Boolean(process.env.MASTER_OTP) && otp === process.env.MASTER_OTP;
    if (isMasterOtp) {
      console.warn(`[MASTER_OTP] Bypassed real OTP check for ${mobile}`);
    }

    const isMatch = isMasterOtp || (await bcrypt.compare(otp, user.otp.codeHash));
    if (!isMatch) {
      user.otp.verifyAttempts = (user.otp.verifyAttempts || 0) + 1;
      if (user.otp.verifyAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        user.otp.lockedUntil = new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60 * 1000);
        user.otp.verifyAttempts = 0;
      }
      await user.save();
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    }

    if (!user.mobileVerified && !name && !user.name) {
      return res.status(400).json({ success: false, msg: "Name is required to complete signup" });
    }

    if (name) user.name = name;
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailTaken) {
        return res.status(409).json({ success: false, msg: "That email is already in use by another account" });
      }
      user.email = email;
    }
    if (city) user.city = city;
    if (roles && roles.length) {
      user.roles = Array.from(new Set([...(user.roles || []), ...roles]));
    }

    const isNewSignup = !user.mobileVerified;

    user.mobileVerified = true;
    user.otp.codeHash = undefined;
    user.otp.expiresAt = undefined;
    user.otp.verifyAttempts = 0;
    user.otp.lockedUntil = undefined;
    await user.save();

    issueSession(res, user);

    // Email is optional on the OTP signup path (unlike the email+password
    // `signup` endpoint below) — only send if they actually gave one.
    if (isNewSignup && user.email) {
      const { subject, html } = welcomeEmail({ name: user.name });
      emailProvider.sendEmail({ to: user.email, subject, html }).catch((err) => console.error("[verifyOtp] welcome email failed:", err.message));
    }

    res.status(200).json({ success: true, msg: "Login successful", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Add a role (shipper/transporter) to the current account without re-verifying the mobile number
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
    delete updates.mobile;
    delete updates.isAdmin;
    delete updates.status;

    if (updates.email) {
      const emailTaken = await User.findOne({ email: updates.email, _id: { $ne: req.auth.id } });
      if (emailTaken) {
        return res.status(409).json({ success: false, msg: "That email is already in use by another account" });
      }
    }

    const user = await User.findByIdAndUpdate(req.auth.id, updates, {
      new: true,
      runValidators: true,
    }).select("-otp +passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.status(200).json({ success: true, msg: "Profile updated", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Creates a brand-new account with a password. Deliberately does NOT attach
// a password to an existing mobile/email match — an unauthenticated
// endpoint that could do that would let anyone "sign up" with a mobile
// number they don't own and take over that account. Adding a password to
// an existing (e.g. OTP-created) account goes through setPassword instead,
// which requires an active session.
const signup = async (req, res) => {
  try {
    const { error } = signupValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { name, mobile, email, password, roles } = req.body;

    const existing = await User.findOne({ $or: [{ mobile }, { email }] });
    if (existing) {
      const field = existing.mobile === mobile ? "mobile number" : "email";
      return res.status(409).json({ success: false, msg: `An account with this ${field} already exists` });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      name,
      mobile,
      email,
      passwordHash,
      roles: roles && roles.length ? roles : [],
      mobileVerified: false,
    });

    issueSession(res, user);

    const { subject, html } = welcomeEmail({ name: user.name });
    emailProvider.sendEmail({ to: user.email, subject, html }).catch((err) => console.error("[signup] welcome email failed:", err.message));

    res.status(201).json({ success: true, msg: "Account created", user: publicProfile(user) });
  } catch (error) {
    sendServerError(res, error, "authController");
  }
};

// Login via either identifier — same account, same session shape as the
// OTP path, just a different way in for users who set a password.
const loginPassword = async (req, res) => {
  try {
    const { error } = loginPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { identifier, password } = req.body;
    const normalized = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: normalized }, { mobile: identifier.trim() }],
    }).select("+passwordHash");

    // Same generic message whether the account doesn't exist or the
    // password is wrong — don't let this endpoint be used to enumerate
    // which emails/mobiles have accounts.
    if (!user || !user.passwordHash) {
      return res.status(400).json({ success: false, msg: "Incorrect email/mobile or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, msg: "Incorrect email/mobile or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        msg: user.status === "banned" ? "This account has been banned" : "This account has been suspended",
      });
    }

    issueSession(res, user);

    res.status(200).json({ success: true, msg: "Login successful", user: publicProfile(user) });
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

    const { email } = req.body;
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
};
