const mongoose = require("mongoose");

const uploadedFileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    storageKey: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    // Public files (truck photos) are servable to anyone, including
    // unauthenticated visitors, unlike private KYC/RC/insurance/permit
    // documents which require owner-or-admin auth to fetch.
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UploadedFile = mongoose.model("UploadedFile", uploadedFileSchema);

module.exports = UploadedFile;
