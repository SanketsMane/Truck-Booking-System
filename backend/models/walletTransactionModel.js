const mongoose = require("mongoose");

// Append-only ledger — one row per actual wallet balance change. Never
// updated or deleted after creation (same convention as AuditLog). A
// balance-neutral event (e.g. a shipper paying a booking directly via
// Razorpay, bypassing the wallet) gets a Payment record instead, not a row
// here — this collection exists only where $inc actually happened.
const walletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    // Denormalized from wallet.user so "all of this user's money movements"
    // is a direct index hit, not a join through Wallet. Null for the
    // platform wallet's own rows.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "recharge",
        "booking_payment",
        "commission_earned",
        "payout_credit",
        "withdrawal_debit",
        "withdrawal_refund",
        "refund",
        "adjustment",
        "dispute_resolution",
      ],
      required: true,
    },

    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Snapshot taken from the same findOneAndUpdate call that wrote the
    // balance change, so the ledger is a verifiable audit trail even if the
    // wallet document itself is inspected independently later.
    balanceAfter: {
      type: Number,
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    withdrawalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WithdrawalRequest",
    },

    dispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
    },

    note: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ booking: 1 });

const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);

module.exports = WalletTransaction;
