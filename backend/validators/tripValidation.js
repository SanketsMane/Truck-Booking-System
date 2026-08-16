const Joi = require("joi");

// Matches backend/models/locationPointSchema.js — address is always
// required (this app has always required a pickup/drop point), lat/lng
// are only present when the frontend's Mapbox-backed autocomplete
// (components/ui/LocationAutocomplete.jsx) actually resolved a suggestion,
// so a freehand-typed address (no exact geocode match) is still accepted.
const locationPointValidation = Joi.object({
  address: Joi.string().trim().required(),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
});

const postTripValidation = Joi.object({
  truckId: Joi.string().hex().length(24).required(),
  fromCity: Joi.string().trim().required(),
  toCity: Joi.string().trim().required(),
  departureAt: Joi.date().greater("now").required(),
  estimatedArrivalAt: Joi.date().greater(Joi.ref("departureAt")),
  pickupPoint: locationPointValidation.required(),
  dropPoint: locationPointValidation.required(),
  totalCapacity: Joi.number().positive().required(),
  availableCapacity: Joi.number().positive().max(Joi.ref("totalCapacity")).required(),
  pricePerTon: Joi.number().positive().required(),
});

const editTripValidation = Joi.object({
  departureAt: Joi.date().greater("now"),
  estimatedArrivalAt: Joi.date(),
  pickupPoint: locationPointValidation,
  dropPoint: locationPointValidation,
  totalCapacity: Joi.number().positive(),
  pricePerTon: Joi.number().positive(),
});

const searchAlertValidation = Joi.object({
  fromCity: Joi.string().trim().required(),
  toCity: Joi.string().trim().required(),
  date: Joi.date().required(),
});

module.exports = { postTripValidation, editTripValidation, searchAlertValidation };
