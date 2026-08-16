const mongoose = require("mongoose");

// A real dispute workflow, distinct from SupportRequest (general help
// tickets, no resolution detail) and Rating.flagged (review moderation
// only) — a dispute needs a required booking link and a real status
// machine.
const disputeSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The counterparty on the booking — derived server-side at raise time
    // (see disputeController.raiseDispute), never client-supplied.
    againstUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      enum: ["no_show", "damaged_goods", "behavior", "other"],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "rejected"],
      default: "open",
    },

    resolutionAction: {
      type: String,
      enum: ["none", "warning_issued", "account_suspended"],
    },

    resolutionNote: {
      type: String,
      trim: true,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// One dispute per raiser per booking — mirrors Rating's {booking,rater}
// uniqueness (the other party can still raise their own, separate dispute
// on the same booking).
disputeSchema.index({ booking: 1, raisedBy: 1 }, { unique: true });
disputeSchema.index({ status: 1, createdAt: -1 });

const Dispute = mongoose.model("Dispute", disputeSchema);

module.exports = Dispute;
