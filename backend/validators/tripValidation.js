const Joi = require("joi");

const { MAX_TRIP_STOPS } = require("../config/marketplaceConfig");

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
  // Ordered intermediate stops. Optional — a direct run just sends none.
  stops: Joi.array().items(locationPointValidation).max(MAX_TRIP_STOPS).default([]).messages({
    "array.max": `A trip can have at most ${MAX_TRIP_STOPS} stops`,
  }),
  totalCapacity: Joi.number().positive().required(),
  availableCapacity: Joi.number().positive().max(Joi.ref("totalCapacity")).required(),
  pricePerTon: Joi.number().positive().required(),
});

const editTripValidation = Joi.object({
  departureAt: Joi.date().greater("now"),
  estimatedArrivalAt: Joi.date(),
  pickupPoint: locationPointValidation,
  dropPoint: locationPointValidation,
  // Sent as the WHOLE new list, not a patch — reordering and removing a
  // stop are both ordinary edits, and there's no stable per-stop id to
  // address one individually by (see tripModel's stops, _id: false).
  stops: Joi.array().items(locationPointValidation).max(MAX_TRIP_STOPS).messages({
    "array.max": `A trip can have at most ${MAX_TRIP_STOPS} stops`,
  }),
  totalCapacity: Joi.number().positive(),
  pricePerTon: Joi.number().positive(),
});

const searchAlertValidation = Joi.object({
  fromCity: Joi.string().trim().required(),
  toCity: Joi.string().trim().required(),
  date: Joi.date().required(),
});

module.exports = { postTripValidation, editTripValidation, searchAlertValidation };
