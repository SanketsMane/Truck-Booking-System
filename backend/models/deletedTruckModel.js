const mongoose = require("mongoose");

// Permanent archive of every truck that's ever been hard-deleted — the
// Truck document itself is gone by the time this is written, so this is
// the only place left to answer "which trucks were deleted, by whom, and
// why." Deliberately its own collection rather than relying solely on
// AuditLog: AuditLog's before/after are freeform JSON meant for an admin
// action trail, not a queryable "truck number + reason" record.
const deletedTruckSchema = new mongoose.Schema(
  {
    regNumber: {
      type: String,
      required: true,
      trim: true,
    },

    truckType: {
      type: String,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // Set when the deletion came from an approved transporter request; left
    // unset when an admin deleted the truck directly.
    deleteRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TruckDeleteRequest",
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

deletedTruckSchema.index({ regNumber: 1 });
deletedTruckSchema.index({ deletedAt: -1 });

const DeletedTruck = mongoose.model("DeletedTruck", deletedTruckSchema);

module.exports = DeletedTruck;
