const Joi = require("joi");
const { MOBILE_PATTERN } = require("../config/marketplaceConfig");

const smsConfigSchemas = {
  console: Joi.object({}),
  twilio: Joi.object({
    accountSid: Joi.string().trim().required(),
    authToken: Joi.string().trim().required(),
    fromNumber: Joi.string().trim().required(),
  }),
  msg91: Joi.object({
    authKey: Joi.string().trim().required(),
    senderId: Joi.string().trim().required(),
    route: Joi.string().trim().allow(""),
  }),
  custom_http: Joi.object({
    method: Joi.string().valid("GET", "POST", "PUT").default("POST"),
    url: Joi.string().uri().required(),
    headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    bodyTemplate: Joi.string().trim().allow(""),
  }),
};

// Resend only, by design — no SMTP/other-vendor option (see
// utils/emailProvider.js). "console" is the internal not-yet-configured
// fallback, not a second real choice.
const emailConfigSchemas = {
  console: Joi.object({}),
  resend: Joi.object({
    apiKey: Joi.string().trim().required(),
    fromAddress: Joi.string().trim().email({ tlds: false }).required(),
    fromName: Joi.string().trim().allow(""),
  }),
};

// Shared shape for KYC's custom_http seam — a webhook URL plus optional
// headers, same generic-integration pattern as SMS's own custom_http
// provider.
const customHttpSeamSchema = Joi.object({
  url: Joi.string().uri().required(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
});

const kycConfigSchemas = {
  manual: Joi.object({}),
  custom_http: customHttpSeamSchema,
};

const updateSmsValidation = Joi.object({
  provider: Joi.string().valid("console", "twilio", "msg91", "custom_http").required(),
  config: Joi.object().required(),
}).custom((value, helpers) => {
  const schema = smsConfigSchemas[value.provider];
  const { error, value: validatedConfig } = schema.validate(value.config);
  if (error) return helpers.message(error.details[0].message);
  return { ...value, config: validatedConfig };
}, "sms config shape");

const updateEmailValidation = Joi.object({
  provider: Joi.string().valid("console", "resend").required(),
  config: Joi.object().required(),
}).custom((value, helpers) => {
  const schema = emailConfigSchemas[value.provider];
  const { error, value: validatedConfig } = schema.validate(value.config);
  if (error) return helpers.message(error.details[0].message);
  return { ...value, config: validatedConfig };
}, "email config shape");

const testSmsValidation = Joi.object({
  mobile: Joi.string().pattern(MOBILE_PATTERN).required(),
});

const testEmailValidation = Joi.object({
  to: Joi.string().trim().email({ tlds: false }).required(),
});

const updateKycValidation = Joi.object({
  provider: Joi.string().valid("manual", "custom_http").required(),
  config: Joi.object().required(),
}).custom((value, helpers) => {
  const schema = kycConfigSchemas[value.provider];
  const { error, value: validatedConfig } = schema.validate(value.config);
  if (error) return helpers.message(error.details[0].message);
  return { ...value, config: validatedConfig };
}, "kyc config shape");

module.exports = {
  smsConfigSchemas,
  emailConfigSchemas,
  kycConfigSchemas,
  updateSmsValidation,
  updateEmailValidation,
  updateKycValidation,
  testSmsValidation,
  testEmailValidation,
};
