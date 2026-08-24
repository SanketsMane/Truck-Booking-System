const mongoose = require("mongoose");
const { normalizeRegNumber } = require("../utils/regNumber");

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
      // A single normalizing setter (not the built-in uppercase/trim
      // options) so "DL 01 AB 7122" and "DL01AB7122" collapse to the same
      // stored value and the unique index actually catches the duplicate.
      set: normalizeRegNumber,
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

    // Orthogonal to `status` (which is purely the KYC review state) — this
    // tracks which of an owner's trucks is their one official truck.
    // "candidate": just registered, not yet the account's active truck.
    // "active": the account's current truck — the only one it can post
    // trips against. "inactive": a former active truck, permanently kept
    // (never deleted) so historical trips referencing it stay resolvable.
    // truckController.reviewTruck flips candidate -> active (and any prior
    // active -> inactive for the same owner) the moment status -> verified.
    lifecycle: {
      type: String,
      enum: ["candidate", "active", "inactive"],
      default: "candidate",
    },

    // The self-declared "I confirm that I am authorized to use and list
    // this vehicle on TruckGee" consent — required because the RC owner
    // doesn't have to be the driver. Enforced by registerTruckValidation,
    // not just UI copy.
    authorizedToList: {
      type: Boolean,
      default: false,
    },

    authorizedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

truckSchema.index({ owner: 1 });
truckSchema.index({ owner: 1, lifecycle: 1 });

const Truck = mongoose.model("Truck", truckSchema);

module.exports = Truck;
