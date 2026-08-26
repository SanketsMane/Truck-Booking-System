const mongoose = require("mongoose");

// One row per mobile device session — this is what makes real per-device
// "log out of just my phone" possible, unlike User.sessionVersion (a single
// scalar the web cookie session relies on, which can only invalidate every
// session at once). The web login flow never touches this collection.
//
// tokenHash, never the raw token, is stored — same principle as password
// hashing (authController.forgotPassword's reset-token hashing is the exact
// precedent) — so a DB read alone can never hand out a usable session.
// Rotated on every /auth/mobile/refresh call: the old row is marked
// revokedAt + replacedByTokenHash rather than deleted, so a REUSE of an
// already-rotated token (a real theft signal — the legitimate holder should
// only ever have the newest one) can be detected and answered by revoking
// every other still-live row for that user.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    // Client-supplied, free-form — not trusted for anything security-
    // relevant, purely so a future "manage devices" screen has something
    // human-readable to show ("iPhone 14 Pro, iOS 17.4").
    deviceId: {
      type: String,
      trim: true,
    },

    deviceInfo: {
      type: String,
      trim: true,
    },

    platform: {
      type: String,
      enum: ["ios", "android"],
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedByTokenHash: {
      type: String,
    },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1 });
// TTL cleanup — once a token's own expiry passes there's nothing left to
// detect reuse against (a legitimate refresh would already have rotated it
// long before then), so it's safe to let Mongo garbage-collect the row.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
