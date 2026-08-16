const mongoose = require("mongoose");
const locationPointSchema = require("./locationPointSchema");

const bookingSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    shipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    capacityRequested: {
      type: Number,
      required: true,
      min: 0,
    },

    goodsDescription: {
      type: String,
      required: true,
      trim: true,
    },

    handlingNotes: {
      type: String,
      trim: true,
    },

    pickupPoint: locationPointSchema(),

    priceEstimate: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "ongoing",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "pending",
    },

    rejectReason: {
      type: String,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    cancelReason: {
      type: String,
    },

    respondBy: {
      type: Date,
    },

    pickupConfirmedAt: {
      type: Date,
    },

    dropConfirmedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ trip: 1 });
bookingSchema.index({ shipper: 1 });
bookingSchema.index({ status: 1, respondBy: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
