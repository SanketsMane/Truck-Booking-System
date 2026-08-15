const Joi = require("joi");

const setPaymentLogValidation = Joi.object({
  bookingId: Joi.string().hex().length(24).required(),
  amount: Joi.number().min(0).required(),
  status: Joi.string().valid("paid", "unpaid", "partial").required(),
});

module.exports = { setPaymentLogValidation };
