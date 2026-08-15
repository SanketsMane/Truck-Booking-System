const Joi = require("joi");

const createSupportRequestValidation = Joi.object({
  subject: Joi.string().trim().required(),
  message: Joi.string().trim().required(),
  bookingId: Joi.string().hex().length(24),
});

module.exports = { createSupportRequestValidation };
