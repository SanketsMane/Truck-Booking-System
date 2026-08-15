const mongoose = require("mongoose");

// FR-04.5 / SRS-04.4 — a shipper can save a route+date search that returned
// no results and get notified when a matching trip is later published.
const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fromCity: {
      type: String,
      required: true,
      trim: true,
    },

    toCity: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    notified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

savedSearchSchema.index({ fromCity: 1, toCity: 1, notified: 1 });

const SavedSearch = mongoose.model("SavedSearch", savedSearchSchema);

module.exports = SavedSearch;
