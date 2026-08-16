const Joi = require("joi");

const raiseDisputeValidation = Joi.object({
  bookingId: Joi.string().hex().length(24).required(),
  category: Joi.string().valid("no_show", "damaged_goods", "behavior", "other").required(),
  description: Joi.string().trim().min(10).required(),
});

const resolveDisputeValidation = Joi.object({
  status: Joi.string().valid("resolved", "rejected").required(),
  resolutionAction: Joi.string().valid("none", "warning_issued", "account_suspended").required(),
  resolutionNote: Joi.string().trim().required(),
});

module.exports = { raiseDisputeValidation, resolveDisputeValidation };
