const Joi = require("joi");
const { PASSWORD_MIN_LENGTH } = require("../config/authConfig");
const { MOBILE_PATTERN } = require("../config/marketplaceConfig");

// tlds: { allow: false } — Joi's built-in TLD allowlist is a static
// snapshot that goes stale and would otherwise reject legitimate addresses
// on newer/less-common TLDs. Format is still fully validated; only the
// TLD-membership check is relaxed.
const emailSchema = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required().messages({
  "string.email": "Enter a valid email address",
});

// Optional — used where mobile is just a secondary contact field being
// edited (profile updates) or where a request may be re-verifying an
// already-complete account (OTP login of an existing user shouldn't demand
// a mobile number just to sign in). allow("", null) so an unfilled optional
// form field (which posts as "") doesn't fail pattern validation.
const mobileSchema = Joi.string()
  .trim()
  .pattern(MOBILE_PATTERN)
  .allow("", null)
  .messages({ "string.pattern.base": "Enter a valid 10-digit Indian mobile number" });

// Mandatory at registration (FR: "mobile number should be a mandatory field
// in registration") — used only where the request is inherently creating a
// brand-new account (password-based /auth/signup). The OTP-based signup
// path can't use a Joi-level required() here since verify-otp is also used
// to log an *existing* user back in — that path enforces "mobile required"
// conditionally in authController.verifyOtp instead, the same way it
// already conditionally requires `name`.
const requiredMobileSchema = Joi.string()
  .trim()
  .pattern(MOBILE_PATTERN)
  .required()
  .messages({
    "string.pattern.base": "Enter a valid 10-digit Indian mobile number",
    "string.empty": "Mobile number is required",
  });

const passwordSchema = Joi.string().min(PASSWORD_MIN_LENGTH).required().messages({
  "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
});

const requestOtpValidation = Joi.object({
  email: emailSchema,
});

const verifyOtpValidation = Joi.object({
  email: emailSchema,
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  name: Joi.string().trim().min(1),
  mobile: mobileSchema,
  city: Joi.string().trim(),
  roles: Joi.array().items(Joi.string().valid("shipper", "transporter")),
});

const addRoleValidation = Joi.object({
  role: Joi.string().valid("shipper", "transporter").required(),
});

const updateProfileValidation = Joi.object({
  name: Joi.string().trim().min(1),
  mobile: mobileSchema,
  city: Joi.string().trim().allow(""),
  profilePhoto: Joi.string().trim().allow(""),
  notificationPreferences: Joi.object().pattern(Joi.string(), Joi.boolean()),
});

const signupValidation = Joi.object({
  name: Joi.string().trim().min(1).required(),
  mobile: requiredMobileSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
  roles: Joi.array().items(Joi.string().valid("shipper", "transporter")),
});

const loginPasswordValidation = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

const forgotPasswordValidation = Joi.object({
  email: emailSchema,
});

const resetPasswordValidation = Joi.object({
  token: Joi.string().trim().required(),
  password: passwordSchema,
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

const setPasswordValidation = Joi.object({
  currentPassword: Joi.string().allow(""),
  newPassword: passwordSchema,
  confirmPassword: Joi.any().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

module.exports = {
  requestOtpValidation,
  verifyOtpValidation,
  addRoleValidation,
  updateProfileValidation,
  signupValidation,
  loginPasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  setPasswordValidation,
};
