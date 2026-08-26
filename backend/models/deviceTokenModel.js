const mongoose = require("mongoose");

// One row per mobile device's FCM registration — the native-app counterpart
// to pushSubscriptionModel.js's browser Web Push subscriptions. Kept as a
// separate model rather than folded into PushSubscription: the two are
// different protocols with different shapes (an opaque FCM token vs a Web
// Push endpoint+keys pair) delivered through entirely different SDKs
// (firebase-admin vs the web-push package) — overloading one schema for
// both would mean every read has to branch on which fields are even present.
const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },

    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ user: 1 });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);

module.exports = DeviceToken;
