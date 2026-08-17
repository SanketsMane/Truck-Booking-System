const Joi = require("joi");

const raiseTruckDeleteRequestValidation = Joi.object({
  reason: Joi.string().trim().min(10).required(),
});

const resolveTruckDeleteRequestValidation = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  resolutionNote: Joi.string().trim().when("status", {
    is: "rejected",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const deleteTruckValidation = Joi.object({
  reason: Joi.string().trim().required(),
});

module.exports = {
  raiseTruckDeleteRequestValidation,
  resolveTruckDeleteRequestValidation,
  deleteTruckValidation,
};
