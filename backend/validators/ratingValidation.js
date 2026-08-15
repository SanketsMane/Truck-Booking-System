const Joi = require("joi");

const submitRatingValidation = Joi.object({
  bookingId: Joi.string().hex().length(24).required(),
  stars: Joi.number().integer().min(1).max(5).required(),
  reviewText: Joi.string().trim().max(1000).allow(""),
});

const moderateRatingValidation = Joi.object({
  action: Joi.string().valid("hide", "remove").required(),
  reason: Joi.string().trim().optional(),
});

module.exports = { submitRatingValidation, moderateRatingValidation };
