const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    rater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ratee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    reviewText: {
      type: String,
      trim: true,
    },

    flagged: {
      type: Boolean,
      default: false,
    },

    moderated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ratingSchema.index({ booking: 1, rater: 1 }, { unique: true });
ratingSchema.index({ ratee: 1 });

const Rating = mongoose.model("Rating", ratingSchema);

module.exports = Rating;
