const mongoose = require("mongoose");
const locationPointSchema = require("./locationPointSchema");

const tripSchema = new mongoose.Schema(
  {
    truck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      required: true,
    },

    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fromCity: {
      type: String,
      required: true,
      trim: true,
    },

    toCity: {
      type: String,
      required: true,
      trim: true,
    },

    // Trimmed+lowercased shadow of fromCity/toCity, populated at write time
    // (tripController.postTrip) — searchTrips matches on these via plain
    // equality instead of the case-insensitive regex fromCity/toCity still
    // display, so search gets a real index seek instead of an index scan.
    fromCityNormalized: {
      type: String,
    },

    toCityNormalized: {
      type: String,
    },

    departureAt: {
      type: Date,
      required: true,
    },

    estimatedArrivalAt: {
      type: Date,
    },

    pickupPoint: locationPointSchema(),

    dropPoint: locationPointSchema(),

    totalCapacity: {
      type: Number,
      required: true,
      min: 0,
    },

    availableCapacity: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerTon: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "published", "full", "ongoing", "completed", "cancelled"],
      default: "draft",
    },

    // Set once the T-24h departure reminder (FR-09.1) has gone out, so the
    // scheduler never sends it twice for the same trip.
    reminderSentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

tripSchema.index({ fromCityNormalized: 1, toCityNormalized: 1, departureAt: 1 });
tripSchema.index({ transporter: 1 });
// Backs the optional nearLat/nearLng/radiusKm search mode (searchTrips) —
// $geoWithin/$centerSphere against the pickup point's coordinates.
tripSchema.index({ "pickupPoint.location": "2dsphere" });

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;
