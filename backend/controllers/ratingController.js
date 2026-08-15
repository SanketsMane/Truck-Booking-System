const Rating = require("../models/ratingModel");
const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const User = require("../models/userModel");
const { notify } = require("../utils/notify");
const { logAdminAction } = require("../utils/audit");
const { submitRatingValidation, moderateRatingValidation } = require("../validators/ratingValidation");
const sendServerError = require("../utils/sendServerError");
const { getPagination, paginatedResponse } = require("../utils/paginate");

// Recomputed from the source ratings rather than incremented in place, so a
// hidden/removed review can never leave the average drifted.
const recomputeRatingStats = async (userId) => {
  const [stats] = await Rating.aggregate([
    { $match: { ratee: userId, moderated: false } },
    { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(userId, {
    ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  });
};

// FR-08.1 / SRS-07.1 — prompted once per party after a booking completes.
const submitRating = async (req, res) => {
  try {
    const { error } = submitRatingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const booking = await Booking.findById(req.body.bookingId);
    if (!booking || booking.status !== "completed") {
      return res.status(400).json({ success: false, msg: "You can only rate a completed booking" });
    }

    const trip = await Trip.findById(booking.trip);
    const isShipper = String(booking.shipper) === req.auth.id;
    const isTransporter = trip && String(trip.transporter) === req.auth.id;
    if (!isShipper && !isTransporter) {
      return res.status(403).json({ success: false, msg: "Forbidden" });
    }

    const ratee = isShipper ? trip.transporter : booking.shipper;

    let rating;
    try {
      rating = await Rating.create({
        booking: booking._id,
        rater: req.auth.id,
        ratee,
        stars: req.body.stars,
        reviewText: req.body.reviewText,
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json({ success: false, msg: "You've already rated this booking" });
      }
      throw createError;
    }

    await recomputeRatingStats(ratee);
    await notify(ratee, "new_rating", { bookingId: booking._id, stars: rating.stars });

    res.status(201).json({ success: true, msg: "Rating submitted", rating });
  } catch (error) {
    sendServerError(res, error, "ratingController");
  }
};

// FR-08.2 — shown on public profile and search result cards.
const listRatingsForUser = async (req, res) => {
  try {
    const ratings = await Rating.find({ ratee: req.params.userId, moderated: false })
      .populate("rater", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, ratings });
  } catch (error) {
    sendServerError(res, error, "ratingController");
  }
};

// FR-08.3 / SRS-10.x — admin queue of flagged reviews awaiting moderation,
// populated the same way adminController's other admin list endpoints are
// (e.g. listUsers/listTrips): compact name+mobile projections, no full docs.
const listFlaggedRatings = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [ratings, total] = await Promise.all([
      Rating.find({ flagged: true })
        .populate("rater", "name mobile")
        .populate("ratee", "name mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Rating.countDocuments({ flagged: true }),
    ]);
    res.status(200).json({ success: true, ...paginatedResponse(ratings, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "ratingController");
  }
};

// FR-08.3 — any authenticated user can flag; admin decides what to do with it.
const flagRating = async (req, res) => {
  try {
    const rating = await Rating.findByIdAndUpdate(req.params.id, { flagged: true }, { new: true });
    if (!rating) {
      return res.status(404).json({ success: false, msg: "Rating not found" });
    }
    res.status(200).json({ success: true, msg: "Rating flagged for review", rating });
  } catch (error) {
    sendServerError(res, error, "ratingController");
  }
};

const moderateRating = async (req, res) => {
  try {
    const { error } = moderateRatingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const rating = await Rating.findById(req.params.id);
    if (!rating) {
      return res.status(404).json({ success: false, msg: "Rating not found" });
    }

    const ratee = rating.ratee;
    const before = { moderated: rating.moderated, flagged: rating.flagged, stars: rating.stars };
    if (req.body.action === "hide") {
      rating.moderated = true;
      await rating.save();
    } else {
      await rating.deleteOne();
    }

    await recomputeRatingStats(ratee);

    await logAdminAction({
      actor: req.auth.id,
      action: "rating.moderate",
      targetType: "Rating",
      targetId: rating._id,
      before,
      after: { action: req.body.action },
      reason: req.body.reason,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: `Rating ${req.body.action === "hide" ? "hidden" : "removed"}` });
  } catch (error) {
    sendServerError(res, error, "ratingController");
  }
};

module.exports = { submitRating, listRatingsForUser, listFlaggedRatings, flagRating, moderateRating };
