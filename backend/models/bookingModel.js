const mongoose = require("mongoose");

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

    // Optional companion to capacityRequested — only meaningful when the
    // trip itself tracks volumeCbm; see utils/capacityHelpers.js.
    volumeRequested: {
      type: Number,
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

    pickupPoint: {
      type: String,
      required: true,
      trim: true,
    },

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

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["wallet", "razorpay"],
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    paidAt: {
      type: Date,
    },

    // Set at accept time — a confirmed booking left unpaid past this point
    // is auto-cancelled by jobs/paymentDeadlines.js so it doesn't squat on
    // the transporter's capacity forever (capacity is already committed at
    // accept time, before payment exists).
    paymentDueBy: {
      type: Date,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ trip: 1 });
bookingSchema.index({ shipper: 1 });
bookingSchema.index({ status: 1, paymentStatus: 1, paymentDueBy: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
