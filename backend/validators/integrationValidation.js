const Joi = require("joi");

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

const emailConfigSchemas = {
  console: Joi.object({}),
  smtp: Joi.object({
    host: Joi.string().trim().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    secure: Joi.boolean().default(false),
    user: Joi.string().trim().allow(""),
    pass: Joi.string().trim().allow(""),
    fromAddress: Joi.string().trim().email({ tlds: false }).required(),
    fromName: Joi.string().trim().allow(""),
  }),
};

const razorpayConfigSchemas = {
  none: Joi.object({}),
  razorpay: Joi.object({
    keyId: Joi.string().trim().required(),
    keySecret: Joi.string().trim().required(),
    webhookSecret: Joi.string().trim().allow(""),
  }),
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
  provider: Joi.string().valid("console", "smtp").required(),
  config: Joi.object().required(),
}).custom((value, helpers) => {
  const schema = emailConfigSchemas[value.provider];
  const { error, value: validatedConfig } = schema.validate(value.config);
  if (error) return helpers.message(error.details[0].message);
  return { ...value, config: validatedConfig };
}, "email config shape");

const testSmsValidation = Joi.object({
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
});

const testEmailValidation = Joi.object({
  to: Joi.string().trim().email({ tlds: false }).required(),
});

const updateRazorpayValidation = Joi.object({
  provider: Joi.string().valid("none", "razorpay").required(),
  config: Joi.object().required(),
}).custom((value, helpers) => {
  const schema = razorpayConfigSchemas[value.provider];
  const { error, value: validatedConfig } = schema.validate(value.config);
  if (error) return helpers.message(error.details[0].message);
  return { ...value, config: validatedConfig };
}, "razorpay config shape");

// Testing just pings Razorpay's API using the already-saved keys — no
// free-text value like a mobile number/email address is needed.
const testRazorpayValidation = Joi.object({});

module.exports = {
  smsConfigSchemas,
  emailConfigSchemas,
  razorpayConfigSchemas,
  updateSmsValidation,
  updateEmailValidation,
  updateRazorpayValidation,
  testSmsValidation,
  testEmailValidation,
  testRazorpayValidation,
};
