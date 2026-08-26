const Joi = require("joi");

const subscribePushValidation = Joi.object({
  endpoint: Joi.string().uri().required(),
  keys: Joi.object({
    p256dh: Joi.string().required(),
    auth: Joi.string().required(),
  }).required(),
});

const unsubscribePushValidation = Joi.object({
  endpoint: Joi.string().uri().required(),
});

const registerDeviceValidation = Joi.object({
  token: Joi.string().trim().required(),
  platform: Joi.string().valid("ios", "android").required(),
});

const unregisterDeviceValidation = Joi.object({
  token: Joi.string().trim().required(),
});

module.exports = {
  subscribePushValidation,
  unsubscribePushValidation,
  registerDeviceValidation,
  unregisterDeviceValidation,
};
