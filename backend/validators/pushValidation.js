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

module.exports = { subscribePushValidation, unsubscribePushValidation };
