const mongoose = require("mongoose");

// A transporter's request to cash out their wallet balance. Funds are
// debited (held) from the wallet the moment the request is submitted, not
// when admin approves — see walletService.applyWalletEntry's $gte-guarded
// debit, which doubles as the "sufficient balance" check. Admin-approved
// manual payout: the admin transfers money outside the app (bank/UPI) and
// then marks the request paid; nothing here calls a real payout API.
const withdrawalRequestSchema = new mongoose.Schema(
  {
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    payoutMethod: {
      type: String,
      enum: ["bank", "upi"],
      required: true,
    },

    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      bankName: { type: String, trim: true },
    },

    upiId: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },

    adminNote: {
      type: String,
      trim: true,
    },

    // UTR / bank reference the admin types in when marking paid, for
    // reconciliation against their own bank statement.
    payoutReference: {
      type: String,
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    paidAt: {
      type: Date,
    },

    // The withdrawal_debit ledger row created at submission time, for
    // traceability back from the request to the exact wallet movement.
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ transporter: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });

const WithdrawalRequest = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);

module.exports = WithdrawalRequest;
