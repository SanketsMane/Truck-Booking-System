const mongoose = require("mongoose");

// One row per money-in event — a Razorpay order (recharge or direct booking
// payment) or a wallet-funded booking payment (method:"wallet", no
// razorpayOrderId, status "paid" immediately). Deliberately includes
// wallet-funded payments too, not just gateway ones, so the admin payments
// table (adminWalletController.listPayments) shows every payment, not a
// subset — the source of truth for "what has been paid, by whom, how".
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    purpose: {
      type: String,
      enum: ["wallet_recharge", "booking_payment"],
      required: true,
    },

    method: {
      type: String,
      enum: ["razorpay", "wallet"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },

    razorpayOrderId: {
      type: String,
    },

    razorpayPaymentId: {
      type: String,
    },

    razorpaySignature: {
      type: String,
    },

    // Which path actually confirmed the payment — useful when both the
    // checkout callback and the webhook race to mark the same order paid.
    verifiedVia: {
      type: String,
      enum: ["checkout", "webhook"],
    },

    failureReason: {
      type: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ purpose: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index(
  { razorpayOrderId: 1 },
  { unique: true, partialFilterExpression: { razorpayOrderId: { $type: "string" } } }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
