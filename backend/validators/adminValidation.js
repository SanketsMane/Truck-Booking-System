const Joi = require("joi");
const { MOBILE_PATTERN } = require("../config/marketplaceConfig");
const { PASSWORD_MIN_LENGTH } = require("../config/authConfig");

// .required() on the object itself (not just its fields) matters on routes
// with no required body shape at the framework level — express.json() leaves
// req.body as undefined, not {}, when a request sends none, and Joi only
// rejects that if the schema says the value itself is required.
const setUserStatusValidation = Joi.object({
  status: Joi.string().valid("active", "suspended", "banned").required(),
  reason: Joi.string().trim().when("status", {
    is: Joi.valid("suspended", "banned"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
}).required();

const forceCancelBookingValidation = Joi.object({
  reason: Joi.string().trim().required(),
}).required();

const deactivateTripValidation = Joi.object({
  reason: Joi.string().trim().required(),
}).required();

const updateSettingsValidation = Joi.object({
  verificationGateEnabled: Joi.boolean().required(),
}).required();

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
  // Surfaced to shippers/transporters once their KYC has sat pending for
  // KYC_ESCALATION_MINUTES (see Profile.jsx) as a "chat with us" fallback —
  // same 10-digit format as contactMobile since wa.me links need a plain
  // number, not the trailing "+91" a user might otherwise type in.
  kycSupportWhatsapp: Joi.string()
    .trim()
    .pattern(MOBILE_PATTERN)
    .allow("", null)
    .messages({ "string.pattern.base": "Enter a valid 10-digit Indian mobile number" }),
  // Real external links (unlike logoUrl/faviconUrl's internal /files/:id
  // paths), so these get an actual .uri() check — they're rendered as
  // <a href> in the footer, not fetched through our own API.
  facebookUrl: Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null).messages({
    "string.uri": "Enter a valid URL (starting with http:// or https://)",
  }),
  instagramUrl: Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null).messages({
    "string.uri": "Enter a valid URL (starting with http:// or https://)",
  }),
  linkedinUrl: Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null).messages({
    "string.uri": "Enter a valid URL (starting with http:// or https://)",
  }),
  youtubeUrl: Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null).messages({
    "string.uri": "Enter a valid URL (starting with http:// or https://)",
  }),
}).required();

const setAdminRoleValidation = Joi.object({
  isAdmin: Joi.boolean().required(),
  adminScope: Joi.string()
    .valid("full", "verification", "support")
    .when("isAdmin", { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }),
}).required();

// Local email/password schemas rather than importing authValidation.js's —
// same reasoning as updateBrandingValidation above. `role` is a single
// choice ("shipper"/"transporter"/"admin") rather than authValidation's
// signup `roles` array, matching the Add User form's one Role field;
// `adminScope` is only meaningful (and only required) when `role` is
// "admin", mirroring setAdminRoleValidation's isAdmin/adminScope pairing.
const createUserValidation = Joi.object({
  name: Joi.string().trim().min(1).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Enter a valid email address",
  }),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required().messages({
    "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  }),
  role: Joi.string().valid("shipper", "transporter", "admin").required(),
  adminScope: Joi.string()
    .valid("full", "verification", "support")
    .when("role", { is: "admin", then: Joi.required(), otherwise: Joi.forbidden() }),
}).required();

module.exports = {
  setUserStatusValidation,
  forceCancelBookingValidation,
  deactivateTripValidation,
  updateSettingsValidation,
  updateBrandingValidation,
  setAdminRoleValidation,
  createUserValidation,
};
