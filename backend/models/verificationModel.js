const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    docType: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["shipper", "transporter"],
      required: true,
    },

    // FR-02.1 — captured alongside the ID/GST document for a business
    // shipper or transporter; optional since an individual has none.
    businessName: {
      type: String,
      trim: true,
    },

    documents: {
      type: [documentSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    rejectReason: {
      type: String,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

verificationSchema.index({ user: 1, type: 1 }, { unique: true });

const Verification = mongoose.model("Verification", verificationSchema);

module.exports = Verification;
