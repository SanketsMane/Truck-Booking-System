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

    // Ordered intermediate stops between pickupPoint and dropPoint — the
    // places the driver actually passes through and can load or unload at
    // on the way. Same embedded shape as pickup/drop (address + optional
    // coords + the GeoJSON shadow utils/setLocationGeo.js keeps in sync),
    // so nothing downstream needs a second kind of point.
    //
    // The order is the route, not just a list: searchTrips walks
    // pickup -> stops[0] -> ... -> dropPoint as one polyline, which is what
    // lets a Mumbai->Nagpur truck stopping at Pune and Nashik surface for a
    // Pune->Nashik search — and what lets it correctly NOT surface for a
    // Nashik->Pune one, since that leg runs backwards along the same path.
    //
    // _id is off: a stop has no identity of its own, it's only ever read
    // and written as part of its trip.
    stops: {
      type: [new mongoose.Schema(locationPointSchema(), { _id: false })],
      default: [],
    },

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
      // "expired" — departureAt passed with no active (confirmed/ongoing)
      // booking, set by jobs/tripExpiry.js. Distinct from "cancelled" (an
      // explicit transporter action) so the two aren't visually/semantically
      // conflated in StatusBadge or the transporter's trip list.
      enum: ["draft", "published", "full", "ongoing", "completed", "cancelled", "expired"],
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
