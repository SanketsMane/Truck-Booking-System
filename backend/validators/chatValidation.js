const Joi = require("joi");

const sendMessageValidation = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
});

module.exports = { sendMessageValidation };
