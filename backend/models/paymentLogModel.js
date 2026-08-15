const mongoose = require("mongoose");

const paymentLogSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["paid", "unpaid", "partial"],
      default: "unpaid",
    },

    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    loggedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

paymentLogSchema.index({ booking: 1 });

const PaymentLog = mongoose.model("PaymentLog", paymentLogSchema);

module.exports = PaymentLog;
