const Trip = require("../models/tripModel");
const Truck = require("../models/truckModel");
const Booking = require("../models/bookingModel");
const Verification = require("../models/verificationModel");
const SavedSearch = require("../models/savedSearchModel");
const PlatformSetting = require("../models/platformSettingModel");
const { notify } = require("../utils/notify");
const { markBookingCancelled } = require("../utils/bookingCancellation");
const escapeRegex = require("../utils/escapeRegex");
const setLocationGeo = require("../utils/setLocationGeo");
const { getPendingHeldMap, visibleAvailable } = require("../utils/capacityHelpers");
const { SEARCH_DATE_RANGE_DAYS, SEARCH_RADIUS_KM_DEFAULT } = require("../config/marketplaceConfig");
const { postTripValidation, editTripValidation, searchAlertValidation } = require("../validators/tripValidation");
const sendServerError = require("../utils/sendServerError");

const EARTH_RADIUS_KM = 6371;

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

// FR-05.5 / SRS-03.3 — optionally requires the transporter's own KYC to be
// verified before a trip can be published (admin-configurable via
// PlatformSetting.verificationGateEnabled, off by default). With the gate
// off, an unverified transporter can still publish — getTrip exposes the
// real verification status instead, so a shipper booking it can see who
// they're dealing with and decide for themselves.
//
// A truck that hasn't been verified yet doesn't block trip creation at
// all (unless it was outright rejected) — the trip is created as a draft
// instead, and truckController.reviewTruck auto-publishes it the moment
// the truck passes verification. Lets a transporter set up the whole trip
// once instead of waiting on the truck review and repeating the form later.
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
    if (truck.status === "rejected") {
      return res.status(400).json({
        success: false,
        msg: "This truck's documents were rejected — resubmit them before creating a trip on it",
      });
    }
    if (totalCapacity > truck.totalCapacity) {
      return res.status(400).json({
        success: false,
        msg: `Trip capacity can't exceed the truck's rated capacity (${truck.totalCapacity} tons)`,
      });
    }

    const settings = await PlatformSetting.getSettings();
    if (settings.verificationGateEnabled) {
      const transporterKyc = await Verification.findOne({ user: req.auth.id, type: "transporter" });
      if (!transporterKyc || transporterKyc.status !== "verified") {
        return res.status(403).json({ success: false, msg: "Complete transporter verification before publishing a trip" });
      }
    }

    const status = truck.status === "verified" ? "published" : "draft";

    const trip = await Trip.create({
      truck: truck._id,
      transporter: req.auth.id,
      fromCity: req.body.fromCity,
      toCity: req.body.toCity,
      fromCityNormalized: req.body.fromCity.trim().toLowerCase(),
      toCityNormalized: req.body.toCity.trim().toLowerCase(),
      departureAt: req.body.departureAt,
      estimatedArrivalAt: req.body.estimatedArrivalAt,
      pickupPoint: setLocationGeo({ ...req.body.pickupPoint }),
      dropPoint: setLocationGeo({ ...req.body.dropPoint }),
      totalCapacity,
      availableCapacity,
      pricePerTon: req.body.pricePerTon,
      status,
    });

    if (status === "published") {
      await notifyMatchingSavedSearches(trip);
    }

    res.status(201).json({
      success: true,
      msg: status === "published" ? "Trip published" : "Trip saved as a draft — it'll go live once your truck is verified",
      trip,
    });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// FR-04.1 / SRS-04.1 — exact city match, date within a configurable window,
// soonest-departure by default. City match is against fromCityNormalized/
// toCityNormalized (trimmed+lowercased at write time) rather than a regex
// on the display fields, so this gets a real index seek — see the compound
// index in models/tripModel.js.
//
// Optional radius mode: nearLat/nearLng (+radiusKm, default
// SEARCH_RADIUS_KM_DEFAULT) matches trips whose pickup point falls within
// that radius, via the 2dsphere index on pickupPoint.location. Independent
// of city search — either mode alone is enough to satisfy the "where"
// requirement, and both can combine to narrow further. Multi-leg/route
// matching (a trip matching a search for part of its route) isn't
// attempted here — that needs real waypoint data, not just an endpoint.
const searchTrips = async (req, res) => {
  try {
    const { fromCity, toCity, date, nearLat, nearLng, radiusKm, minCapacity, sort = "departure", rangeDays } = req.query;

    const hasCitySearch = Boolean(fromCity && toCity);
    const hasNearSearch = nearLat !== undefined && nearLng !== undefined;
    if (!hasCitySearch && !hasNearSearch) {
      return res.status(400).json({
        success: false,
        msg: "Provide either fromCity and toCity, or nearLat and nearLng",
      });
    }
    if (!date) {
      return res.status(400).json({ success: false, msg: "date is required" });
    }

    // IST is UTC+5:30 with no DST, and the frontend always sends a plain
    // YYYY-MM-DD date with no time/zone — parsing that directly with
    // `new Date(...)` anchors it at UTC midnight, which is 5:30am IST, not
    // the start of the India calendar day a shipper actually means when
    // they pick "20 Aug". Anchoring at IST midnight instead keeps the
    // ±windowDays range centered on the real day, not shifted by 5.5 hours.
    const searchDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00+05:30`) : new Date(date);
    if (Number.isNaN(searchDate.getTime())) {
      return res.status(400).json({ success: false, msg: "Invalid date" });
    }

    const windowDays = Number(rangeDays) || SEARCH_DATE_RANGE_DAYS;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    const filter = {
      status: "published",
      availableCapacity: { $gte: Number(minCapacity) || 0 },
      departureAt: {
        $gte: new Date(searchDate.getTime() - windowMs),
        $lte: new Date(searchDate.getTime() + windowMs),
      },
    };

    if (hasCitySearch) {
      filter.fromCityNormalized = fromCity.trim().toLowerCase();
      filter.toCityNormalized = toCity.trim().toLowerCase();
    }

    if (hasNearSearch) {
      const lat = Number(nearLat);
      const lng = Number(nearLng);
      const radius = Number(radiusKm) || SEARCH_RADIUS_KM_DEFAULT;
      if (Number.isNaN(lat) || Number.isNaN(lng) || radius <= 0) {
        return res.status(400).json({ success: false, msg: "nearLat/nearLng/radiusKm must be valid numbers" });
      }
      filter["pickupPoint.location"] = { $geoWithin: { $centerSphere: [[lng, lat], radius / EARTH_RADIUS_KM] } };
    }

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
    // Just the boolean, not the transporter's KYC documents/history — same
    // "no document exposure on this public endpoint" boundary the existing
    // comment above already draws for the truck's own fields.
    const transporterKyc = await Verification.findOne({ user: trip.transporter._id, type: "transporter" }).select("status");
    const tripWithVisibility = {
      ...trip.toObject(),
      visibleAvailableCapacity: visibleAvailable(trip, heldMap),
      transporterVerified: transporterKyc?.status === "verified",
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
    const trips = await Trip.find(filter).populate("truck", "regNumber truckType photos status").sort({ createdAt: -1 });
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
    if (!["draft", "published", "full"].includes(trip.status)) {
      return res.status(400).json({ success: false, msg: `Trip can't be edited while ${trip.status}` });
    }

    const otherFields = {};
    ["departureAt", "estimatedArrivalAt", "pickupPoint", "dropPoint", "pricePerTon"].forEach((field) => {
      if (req.body[field] !== undefined) otherFields[field] = req.body[field];
    });
    if (otherFields.pickupPoint) otherFields.pickupPoint = setLocationGeo({ ...otherFields.pickupPoint });
    if (otherFields.dropPoint) otherFields.dropPoint = setLocationGeo({ ...otherFields.dropPoint });

    let updated = trip;

    // Changing totalCapacity by X changes availableCapacity by the same X,
    // regardless of how much is currently booked — so this can be applied
    // as a single atomic $inc that composes correctly with a concurrent
    // acceptBooking/cancelBooking capacity change instead of racing a
    // stale read-then-write against them. The $gte guard is exactly
    // "the resulting availableCapacity won't go negative."
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

    if (Object.keys(otherFields).length) {
      updated = await Trip.findOneAndUpdate(
        { _id: trip._id, transporter: req.auth.id },
        { $set: otherFields },
        { new: true }
      );
    }

    // Only toggle between published/full — a draft trip stays draft no
    // matter what capacity/price/date edits happen to it. It only ever
    // becomes published via truckController.reviewTruck's auto-publish,
    // once the truck it's waiting on is actually verified.
    if (["published", "full"].includes(updated.status)) {
      const nextStatus = updated.availableCapacity > 0 ? "published" : "full";
      if (updated.status !== nextStatus) {
        updated.status = nextStatus;
        await updated.save();
      }
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
        await markBookingCancelled(booking, {
          cancelledBy: req.auth.id,
          reason: "Trip cancelled by transporter",
        });
        await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
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
