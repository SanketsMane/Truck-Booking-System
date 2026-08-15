const mongoose = require("mongoose");

// One row per browser/device subscription — a user can have several (phone
// + laptop, or a re-subscribe after clearing site data leaves the old
// endpoint dangling until webPush.js prunes it on a 404/410 send failure).
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
    },

    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1 });

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);

module.exports = PushSubscription;
