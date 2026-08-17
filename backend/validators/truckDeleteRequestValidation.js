const Joi = require("joi");

// .required() on the object itself, not just its fields — deleteTruckValidation
// in particular guards a DELETE route, where express.json() leaves req.body
// as undefined (not {}) when the request sends no body at all.
const raiseTruckDeleteRequestValidation = Joi.object({
  reason: Joi.string().trim().min(10).required(),
}).required();

const resolveTruckDeleteRequestValidation = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  resolutionNote: Joi.string().trim().when("status", {
    is: "rejected",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
}).required();

const deleteTruckValidation = Joi.object({
  reason: Joi.string().trim().required(),
}).required();

module.exports = {
  raiseTruckDeleteRequestValidation,
  resolveTruckDeleteRequestValidation,
  deleteTruckValidation,
};
