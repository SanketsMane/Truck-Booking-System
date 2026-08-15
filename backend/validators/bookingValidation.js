const Joi = require("joi");

const createBookingValidation = Joi.object({
  tripId: Joi.string().hex().length(24).required(),
  capacityRequested: Joi.number().positive().required(),
  volumeRequested: Joi.number().positive().optional(),
  goodsDescription: Joi.string().trim().required(),
  handlingNotes: Joi.string().trim().allow(""),
  pickupPoint: Joi.string().trim(),
});

const rejectBookingValidation = Joi.object({
  reason: Joi.string().trim().allow(""),
});

const cancelBookingValidation = Joi.object({
  reason: Joi.string().trim().allow(""),
});

module.exports = { createBookingValidation, rejectBookingValidation, cancelBookingValidation };
