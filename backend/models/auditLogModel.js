const mongoose = require("mongoose");

// SRS §5.8 — every admin action touching verification, bookings, trips, or
// payment logs is recorded with actor, timestamp, and prior/new state.
const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    targetType: {
      type: String,
      required: true,
    },

    // Usually an ObjectId (User/Trip/Booking/etc.), but PlatformSetting is a
    // singleton with a fixed string _id ("global") — Mixed so settings/
    // integration actions can be logged too instead of silently failing.
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    before: {
      type: mongoose.Schema.Types.Mixed,
    },

    after: {
      type: mongoose.Schema.Types.Mixed,
    },

    reason: {
      type: String,
    },

    // Which admin scope the actor was acting under at the time — a plain
    // string snapshot, not derived from the current User doc, so this stays
    // accurate even if the actor's adminScope is changed or revoked later.
    scope: {
      type: String,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ targetType: 1, targetId: 1 });
// The admin audit-log viewer's default (and only) sort is newest-first.
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
