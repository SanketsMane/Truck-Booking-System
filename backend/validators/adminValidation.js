const Joi = require("joi");
const { MOBILE_PATTERN } = require("../config/marketplaceConfig");

const setUserStatusValidation = Joi.object({
  status: Joi.string().valid("active", "suspended", "banned").required(),
  reason: Joi.string().trim().when("status", {
    is: Joi.valid("suspended", "banned"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const forceCancelBookingValidation = Joi.object({
  reason: Joi.string().trim().required(),
});

const deactivateTripValidation = Joi.object({
  reason: Joi.string().trim().required(),
});

const updateSettingsValidation = Joi.object({
  verificationGateEnabled: Joi.boolean().required(),
});

const updateCommissionValidation = Joi.object({
  commissionPercent: Joi.number().min(0).max(100).required(),
});

// A local email schema rather than importing authValidation.js's — that
// file is mid-rewrite in a concurrently-running session, and branding's
// contact email has no need to share a schema object with login/signup.
const updateBrandingValidation = Joi.object({
  platformName: Joi.string().trim().min(1).max(60).required(),
  logoUrl: Joi.string().trim().allow("", null),
  faviconUrl: Joi.string().trim().allow("", null),
  contactEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow("", null).messages({
    "string.email": "Enter a valid contact email address",
  }),
  contactMobile: Joi.string()
    .trim()
    .pattern(MOBILE_PATTERN)
    .allow("", null)
    .messages({ "string.pattern.base": "Enter a valid 10-digit Indian mobile number" }),
});

const setAdminRoleValidation = Joi.object({
  isAdmin: Joi.boolean().required(),
  adminScope: Joi.string()
    .valid("full", "verification", "support", "finance")
    .when("isAdmin", { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }),
});

module.exports = {
  setUserStatusValidation,
  forceCancelBookingValidation,
  deactivateTripValidation,
  updateSettingsValidation,
  updateCommissionValidation,
  updateBrandingValidation,
  setAdminRoleValidation,
};
