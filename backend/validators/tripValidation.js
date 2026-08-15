const Joi = require("joi");

const postTripValidation = Joi.object({
  truckId: Joi.string().hex().length(24).required(),
  fromCity: Joi.string().trim().required(),
  toCity: Joi.string().trim().required(),
  departureAt: Joi.date().greater("now").required(),
  estimatedArrivalAt: Joi.date().greater(Joi.ref("departureAt")),
  pickupPoint: Joi.string().trim().required(),
  dropPoint: Joi.string().trim().required(),
  totalCapacity: Joi.number().positive().required(),
  availableCapacity: Joi.number().positive().max(Joi.ref("totalCapacity")).required(),
  // Optional pair, mirroring totalCapacity/availableCapacity — required
  // together so a trip never ends up with a volume figure but no available
  // figure (or vice versa).
  volumeCbm: Joi.number().positive().optional(),
  availableVolumeCbm: Joi.when("volumeCbm", {
    is: Joi.exist(),
    then: Joi.number().positive().max(Joi.ref("volumeCbm")).required(),
    otherwise: Joi.forbidden(),
  }),
  pricePerTon: Joi.number().positive().required(),
});

const editTripValidation = Joi.object({
  departureAt: Joi.date().greater("now"),
  estimatedArrivalAt: Joi.date(),
  pickupPoint: Joi.string().trim(),
  dropPoint: Joi.string().trim(),
  totalCapacity: Joi.number().positive(),
  volumeCbm: Joi.number().positive(),
  pricePerTon: Joi.number().positive(),
});

const searchAlertValidation = Joi.object({
  fromCity: Joi.string().trim().required(),
  toCity: Joi.string().trim().required(),
  date: Joi.date().required(),
});

module.exports = { postTripValidation, editTripValidation, searchAlertValidation };
