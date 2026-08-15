const mongoose = require("mongoose");

// Append-only GPS history — one row per accepted location ping from a
// transporter's device. Trip.currentLocation holds just the latest fix for
// fast reads; this collection is the full trail used to draw a breadcrumb
// line on the live map and (via the TTL index below) ages itself out.
const tripLocationPingSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    accuracy: Number,
    heading: Number,
    speed: Number,

    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

tripLocationPingSchema.index({ trip: 1, recordedAt: -1 });

// GPS history is sensitive personal data with no lasting business value
// past a trip's lifetime — auto-expire after 30 days rather than growing
// this collection forever.
tripLocationPingSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const TripLocationPing = mongoose.model("TripLocationPing", tripLocationPingSchema);

module.exports = TripLocationPing;
