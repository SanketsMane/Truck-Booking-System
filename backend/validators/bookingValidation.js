const Joi = require("joi");

// Matches backend/models/locationPointSchema.js — see tripValidation.js's
// copy of this same shape for why lat/lng are optional.
const locationPointValidation = Joi.object({
  address: Joi.string().trim().required(),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
});

const createBookingValidation = Joi.object({
  tripId: Joi.string().hex().length(24).required(),
  capacityRequested: Joi.number().positive().required(),
  goodsDescription: Joi.string().trim().required(),
  handlingNotes: Joi.string().trim().allow(""),
  pickupPoint: locationPointValidation,
});

const rejectBookingValidation = Joi.object({
  reason: Joi.string().trim().allow(""),
});

const cancelBookingValidation = Joi.object({
  reason: Joi.string().trim().allow(""),
});

module.exports = { createBookingValidation, rejectBookingValidation, cancelBookingValidation };
