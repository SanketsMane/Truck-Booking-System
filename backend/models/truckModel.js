const mongoose = require("mongoose");

const truckDocumentSchema = new mongoose.Schema(
  {
    docType: {
      type: String,
      enum: ["rc", "insurance", "permit"],
      required: true,
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

// Truck photos, unlike documents, aren't KYC categories — no docType, just
// the file reference. These are stored as isPublic UploadedFile records so
// shoppers (including logged-out ones) can view them on a trip's page.
const truckPhotoSchema = new mongoose.Schema(
  {
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

const truckSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    regNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    truckType: {
      type: String,
      required: true,
      trim: true,
    },

    bodyType: {
      type: String,
      trim: true,
    },

    totalCapacity: {
      type: Number,
      required: true,
      min: 0,
    },

    documents: {
      type: [truckDocumentSchema],
      default: [],
    },

    photos: {
      type: [truckPhotoSchema],
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

truckSchema.index({ owner: 1 });

const Truck = mongoose.model("Truck", truckSchema);

module.exports = Truck;
