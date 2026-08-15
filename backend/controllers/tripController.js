const Trip = require("../models/tripModel");
const Truck = require("../models/truckModel");
const Booking = require("../models/bookingModel");
const Verification = require("../models/verificationModel");
const SavedSearch = require("../models/savedSearchModel");
const PlatformSetting = require("../models/platformSettingModel");
const { notify } = require("../utils/notify");
const { cancelBookingWithRefund } = require("../utils/bookingCancellation");
const escapeRegex = require("../utils/escapeRegex");
const { getPendingHeldMap, visibleAvailable, visibleAvailableVolume } = require("../utils/capacityHelpers");
const { SEARCH_DATE_RANGE_DAYS } = require("../config/marketplaceConfig");
const { postTripValidation, editTripValidation, searchAlertValidation } = require("../validators/tripValidation");
const sendServerError = require("../utils/sendServerError");

const cityMatch = (city) => new RegExp(`^${escapeRegex(city.trim())}$`, "i");

const notifyMatchingSavedSearches = async (trip) => {
  const windowMs = SEARCH_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
  const matches = await SavedSearch.find({
    fromCity: cityMatch(trip.fromCity),
    toCity: cityMatch(trip.toCity),
    notified: false,
    date: {
      $gte: new Date(trip.departureAt.getTime() - windowMs),
      $lte: new Date(trip.departureAt.getTime() + windowMs),
    },
  });

  await Promise.all(
    matches.map(async (match) => {
      await notify(match.user, "saved_search_match", {
        tripId: trip._id,
        fromCity: trip.fromCity,
        toCity: trip.toCity,
        departureAt: trip.departureAt,
      });
      match.notified = true;
      await match.save();
    })
  );
};

// FR-05.5 / SRS-03.3 — a trip only becomes searchable once its truck AND
// the transporter's own KYC are verified (hard gate, admin-configurable
// via PlatformSetting.verificationGateEnabled).
const postTrip = async (req, res) => {
  try {
    const { error } = postTripValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { truckId, totalCapacity, availableCapacity } = req.body;

    const truck = await Truck.findOne({ _id: truckId, owner: req.auth.id });
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }
    if (totalCapacity > truck.totalCapacity) {
      return res.status(400).json({
        success: false,
        msg: `Trip capacity can't exceed the truck's rated capacity (${truck.totalCapacity} tons)`,
      });
    }

    const settings = await PlatformSetting.getSettings();
    if (settings.verificationGateEnabled) {
      if (truck.status !== "verified") {
        return res.status(403).json({ success: false, msg: "This truck isn't verified yet" });
      }
      const transporterKyc = await Verification.findOne({ user: req.auth.id, type: "transporter" });
      if (!transporterKyc || transporterKyc.status !== "verified") {
        return res.status(403).json({ success: false, msg: "Complete transporter verification before publishing a trip" });
      }
    }

    const trip = await Trip.create({
      truck: truck._id,
      transporter: req.auth.id,
      fromCity: req.body.fromCity,
      toCity: req.body.toCity,
      departureAt: req.body.departureAt,
      estimatedArrivalAt: req.body.estimatedArrivalAt,
      pickupPoint: req.body.pickupPoint,
      dropPoint: req.body.dropPoint,
      totalCapacity,
      availableCapacity,
      volumeCbm: req.body.volumeCbm,
      availableVolumeCbm: req.body.availableVolumeCbm,
      pricePerTon: req.body.pricePerTon,
      status: "published",
    });

    await notifyMatchingSavedSearches(trip);

    res.status(201).json({ success: true, msg: "Trip published", trip });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// FR-04.1 / SRS-04.1 — exact city match (case-insensitive), date within a
// configurable window, soonest-departure by default.
const searchTrips = async (req, res) => {
  try {
    const { fromCity, toCity, date, minCapacity, minVolumeCbm, sort = "departure", rangeDays } = req.query;
    if (!fromCity || !toCity || !date) {
      return res.status(400).json({ success: false, msg: "fromCity, toCity and date are required" });
    }

    const searchDate = new Date(date);
    if (Number.isNaN(searchDate.getTime())) {
      return res.status(400).json({ success: false, msg: "Invalid date" });
    }

    const windowDays = Number(rangeDays) || SEARCH_DATE_RANGE_DAYS;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    const filter = {
      fromCity: cityMatch(fromCity),
      toCity: cityMatch(toCity),
      status: "published",
      availableCapacity: { $gte: Number(minCapacity) || 0 },
      departureAt: {
        $gte: new Date(searchDate.getTime() - windowMs),
        $lte: new Date(searchDate.getTime() + windowMs),
      },
    };
    // Only trips that actually track volume can guarantee a minimum, so
    // this naturally excludes weight-only trips rather than treating them
    // as having unlimited volume.
    if (minVolumeCbm) filter.availableVolumeCbm = { $gte: Number(minVolumeCbm) };

    let query = Trip.find(filter)
      .populate("truck", "truckType bodyType totalCapacity photos")
      .populate("transporter", "name city ratingAvg ratingCount");

    if (sort === "price") query = query.sort({ pricePerTon: 1 });
    else if (sort === "departure") query = query.sort({ departureAt: 1 });

    let trips = await query.exec();

    if (sort === "rating") {
      trips = trips.sort((a, b) => (b.transporter?.ratingAvg || 0) - (a.transporter?.ratingAvg || 0));
    }

    // SRS-05.1 — capacity already claimed by other shippers' pending
    // requests should be visible here, not just enforced silently when a
    // new request is submitted.
    const heldMap = await getPendingHeldMap(trips.map((t) => t._id));
    const tripsWithVisibility = trips.map((trip) => ({
      ...trip.toObject(),
      visibleAvailableCapacity: visibleAvailable(trip, heldMap),
      visibleAvailableVolumeCbm: visibleAvailableVolume(trip, heldMap),
    }));

    res.status(200).json({ success: true, trips: tripsWithVisibility, count: tripsWithVisibility.length });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const popularRoutes = async (req, res) => {
  try {
    const routes = await Trip.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: { fromCity: "$fromCity", toCity: "$toCity" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, fromCity: "$_id.fromCity", toCity: "$_id.toCity", count: 1 } },
    ]);
    res.status(200).json({ success: true, routes });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const getTrip = async (req, res) => {
  try {
    // Public, unauthenticated endpoint — never expose the truck's KYC
    // documents, verification history, or reviewing admin's identity here.
    // photos are safe to include: they're isPublic UploadedFile records,
    // unlike documents (rc/insurance/permit), which stay excluded.
    const trip = await Trip.findById(req.params.id)
      .populate("truck", "regNumber truckType bodyType totalCapacity status photos")
      .populate("transporter", "name city ratingAvg ratingCount createdAt");
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }

    const heldMap = await getPendingHeldMap([trip._id]);
    const tripWithVisibility = {
      ...trip.toObject(),
      visibleAvailableCapacity: visibleAvailable(trip, heldMap),
      visibleAvailableVolumeCbm: visibleAvailableVolume(trip, heldMap),
    };

    res.status(200).json({ success: true, trip: tripWithVisibility });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const listMyTrips = async (req, res) => {
  try {
    const filter = { transporter: req.auth.id };
    if (req.query.status) filter.status = req.query.status;
    const trips = await Trip.find(filter).populate("truck", "regNumber truckType photos").sort({ createdAt: -1 });
    res.status(200).json({ success: true, trips });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// SRS-03.4 — capacity/price editable on an unbooked or partially-booked
// trip; total capacity may never drop below what's already confirmed.
const editTrip = async (req, res) => {
  try {
    const { error } = editTripValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const trip = await Trip.findOne({ _id: req.params.id, transporter: req.auth.id });
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }
    if (!["published", "full"].includes(trip.status)) {
      return res.status(400).json({ success: false, msg: `Trip can't be edited while ${trip.status}` });
    }
    if (req.body.volumeCbm !== undefined && trip.volumeCbm == null) {
      return res.status(400).json({ success: false, msg: "This trip doesn't track volume" });
    }

    const otherFields = {};
    ["departureAt", "estimatedArrivalAt", "pickupPoint", "dropPoint", "pricePerTon"].forEach((field) => {
      if (req.body[field] !== undefined) otherFields[field] = req.body[field];
    });

    let updated = trip;

    // Changing totalCapacity by X changes availableCapacity by the same X,
    // regardless of how much is currently booked — so this can be applied
    // as a single atomic $inc that composes correctly with a concurrent
    // acceptBooking/cancelBooking capacity change instead of racing a
    // stale read-then-write against them. The $gte guard is exactly
    // "the resulting availableCapacity won't go negative." volumeCbm gets
    // the same treatment, as an independent resource, when the trip tracks
    // it — applied as its own atomic update rather than folded into the
    // capacity one, since the two are unrelated dimensions.
    if (req.body.totalCapacity !== undefined) {
      const delta = req.body.totalCapacity - updated.totalCapacity;
      const result = await Trip.findOneAndUpdate(
        { _id: trip._id, transporter: req.auth.id, availableCapacity: { $gte: -delta } },
        { $inc: { totalCapacity: delta, availableCapacity: delta } },
        { new: true }
      );
      if (!result) {
        const bookedCapacity = updated.totalCapacity - updated.availableCapacity;
        return res.status(409).json({
          success: false,
          msg: `Can't reduce capacity below the ~${bookedCapacity} tons already booked`,
        });
      }
      updated = result;
    }

    if (req.body.volumeCbm !== undefined) {
      const delta = req.body.volumeCbm - updated.volumeCbm;
      const result = await Trip.findOneAndUpdate(
        { _id: trip._id, transporter: req.auth.id, availableVolumeCbm: { $gte: -delta } },
        { $inc: { volumeCbm: delta, availableVolumeCbm: delta } },
        { new: true }
      );
      if (!result) {
        const bookedVolume = updated.volumeCbm - updated.availableVolumeCbm;
        return res.status(409).json({
          success: false,
          msg: `Can't reduce volume below the ~${bookedVolume} m³ already booked`,
        });
      }
      updated = result;
    }

    if (Object.keys(otherFields).length) {
      updated = await Trip.findOneAndUpdate(
        { _id: trip._id, transporter: req.auth.id },
        { $set: otherFields },
        { new: true }
      );
    }

    const nextStatus = updated.availableCapacity > 0 ? "published" : "full";
    if (updated.status !== nextStatus) {
      updated.status = nextStatus;
      await updated.save();
    }

    res.status(200).json({ success: true, msg: "Trip updated", trip: updated });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// SRS-03.5 — cancelling a trip with confirmed bookings cancels those
// bookings too (refunding any that were paid) and notifies each affected
// shipper. A booking already in transit ("ongoing" — pickup confirmed,
// goods loaded) can't be undone by cancelling the trip around it, so that's
// blocked outright rather than left dangling with no valid next state.
const cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, transporter: req.auth.id });
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }
    if (["completed", "cancelled"].includes(trip.status)) {
      return res.status(400).json({ success: false, msg: `Trip is already ${trip.status}` });
    }

    const ongoingCount = await Booking.countDocuments({ trip: trip._id, status: "ongoing" });
    if (ongoingCount > 0) {
      return res.status(400).json({
        success: false,
        msg: "This trip has goods already picked up and in transit — it can't be cancelled until delivery is confirmed",
      });
    }

    trip.status = "cancelled";
    await trip.save();

    const affectedBookings = await Booking.find({ trip: trip._id, status: { $in: ["pending", "confirmed"] } });
    await Promise.all(
      affectedBookings.map(async (booking) => {
        const { wasPaid } = await cancelBookingWithRefund(booking, {
          cancelledBy: req.auth.id,
          reason: "Trip cancelled by transporter",
        });
        await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
        if (wasPaid) {
          await notify(booking.shipper, "wallet_credited", {
            bookingId: booking._id,
            amount: booking.priceEstimate,
            reason: "refund",
          });
        }
      })
    );

    res.status(200).json({ success: true, msg: "Trip cancelled", trip });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const saveSearchAlert = async (req, res) => {
  try {
    const { error } = searchAlertValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const alert = await SavedSearch.create({ user: req.auth.id, ...req.body });
    res.status(201).json({ success: true, msg: "We'll notify you when a matching trip is posted", alert });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

module.exports = {
  postTrip,
  searchTrips,
  popularRoutes,
  getTrip,
  listMyTrips,
  editTrip,
  cancelTrip,
  saveSearchAlert,
};
