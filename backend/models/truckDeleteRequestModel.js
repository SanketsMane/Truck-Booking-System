const mongoose = require("mongoose");

// A transporter's ask to permanently remove one of their trucks — mirrors
// disputeModel.js's request/resolve shape (raise -> pending -> admin
// resolves). Kept separate from Truck.status (pending/verified/rejected)
// since that's a verification-workflow state, not a deletion-workflow one.
const truckDeleteRequestSchema = new mongoose.Schema(
  {
    truck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      required: true,
    },

    // Snapshotted at request time so the request (and later, the resolved
    // record) still reads sensibly even after the truck itself is deleted.
    regNumber: {
      type: String,
      required: true,
      trim: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    resolvedAt: {
      type: Date,
    },

    resolutionNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

truckDeleteRequestSchema.index({ truck: 1, status: 1 });
truckDeleteRequestSchema.index({ status: 1, createdAt: -1 });

const TruckDeleteRequest = mongoose.model("TruckDeleteRequest", truckDeleteRequestSchema);

module.exports = TruckDeleteRequest;
