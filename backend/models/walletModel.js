const mongoose = require("mongoose");
const { DEFAULT_CURRENCY } = require("../config/marketplaceConfig");

// One wallet per user, plus a single ownerType:"platform" doc (user: null)
// that acts as the platform/admin earnings wallet — same shape, same
// atomic-update code path, rather than a separate model or folding balance
// state into PlatformSetting (a low-frequency, human-edited document).
const walletSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["user", "platform"],
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    balance: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
    },
  },
  { timestamps: true }
);

// A compound unique index over {ownerType, user} gives one wallet per user
// (user set) and lets exactly one {ownerType:"platform", user:null} document
// exist (Mongo treats an all-null compound key as one distinct value).
walletSchema.index({ ownerType: 1, user: 1 }, { unique: true });

walletSchema.statics.getOrCreateForUser = async function (userId, session) {
  return this.findOneAndUpdate(
    { ownerType: "user", user: userId },
    { $setOnInsert: { ownerType: "user", user: userId, balance: 0 } },
    { upsert: true, new: true, session }
  );
};

walletSchema.statics.getPlatformWallet = async function (session) {
  return this.findOneAndUpdate(
    { ownerType: "platform", user: null },
    { $setOnInsert: { ownerType: "platform", user: null, balance: 0 } },
    { upsert: true, new: true, session }
  );
};

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
