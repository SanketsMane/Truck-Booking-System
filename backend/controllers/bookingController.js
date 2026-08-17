const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const ChatThread = require("../models/chatThreadModel");
const Verification = require("../models/verificationModel");
const PlatformSetting = require("../models/platformSettingModel");
const User = require("../models/userModel");
const { notify } = require("../utils/notify");
const { getPendingHeldMap } = require("../utils/capacityHelpers");
const smsProvider = require("../utils/smsProvider");
const emailProvider = require("../utils/emailProvider");
const { bookingConfirmedEmail } = require("../emailTemplates/templates");
const sendServerError = require("../utils/sendServerError");
const { markBookingCancelled } = require("../utils/bookingCancellation");
const { getBrandName } = require("../utils/brandingCache");
const {
  BOOKING_RESPONSE_WINDOW_HOURS,
  CANCELLATION_WINDOW_HOURS,
} = require("../config/marketplaceConfig");
const {
  createBookingValidation,
  rejectBookingValidation,
  cancelBookingValidation,
} = require("../validators/bookingValidation");

// Pending requests the transporter never actioned auto-expire (SRS-05.4).
// Applied lazily on every read path (so a booking someone is actively
// looking at expires immediately, not on the next cron tick) AND swept
// periodically by jobs/staleBookings.js, so one nobody ever reads again
// still expires within a bounded window instead of staying "pending"
// forever.
const expireStalePendingBookings = async (filter) => {
  const stale = await Booking.find({ ...filter, status: "pending", respondBy: { $lt: new Date() } });
  await Promise.all(stale.map((booking) => expireIfStale(booking)));
  return stale.length;
};

// Same lazy-expiry rule, but for a single already-fetched booking — used on
// the get/accept/reject paths, which don't go through a list filter and
// would otherwise never expire a request past its respondBy window.
const expireIfStale = async (booking) => {
  if (booking.status === "pending" && booking.respondBy && booking.respondBy < new Date()) {
    booking.status = "expired";
    await booking.save();
    await notify(booking.shipper, "booking_expired", { bookingId: booking._id, tripId: booking.trip });
    return true;
  }
  return false;
};

// FR-06.1–06.4 / SRS-05.1 — capacity is soft-held: not deducted from
// trip.availableCapacity until accept, but a request can never exceed what
// isn't already claimed by other pending requests, so the number shown to
// the next shipper never overpromises.
const createBooking = async (req, res) => {
  try {
    const { error } = createBookingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const trip = await Trip.findById(req.body.tripId);
    if (!trip || trip.status !== "published") {
      return res.status(400).json({ success: false, msg: "This trip isn't accepting bookings" });
    }
    if (String(trip.transporter) === req.auth.id) {
      return res.status(400).json({ success: false, msg: "You can't book your own trip" });
    }

    await expireStalePendingBookings({ trip: trip._id });

    const heldMap = await getPendingHeldMap([trip._id]);
    const held = heldMap.get(String(trip._id)) || { capacity: 0 };
    const visibleAvailable = trip.availableCapacity - held.capacity;

    if (req.body.capacityRequested > visibleAvailable) {
      return res.status(400).json({
        success: false,
        msg: `Only ${Math.max(visibleAvailable, 0)} tons available on this trip right now`,
      });
    }

    const respondByCandidate = new Date(Date.now() + BOOKING_RESPONSE_WINDOW_HOURS * 60 * 60 * 1000);
    const respondBy = respondByCandidate < trip.departureAt ? respondByCandidate : trip.departureAt;

    const booking = await Booking.create({
      trip: trip._id,
      shipper: req.auth.id,
      capacityRequested: req.body.capacityRequested,
      goodsDescription: req.body.goodsDescription,
      handlingNotes: req.body.handlingNotes,
      pickupPoint: req.body.pickupPoint || trip.pickupPoint,
      priceEstimate: Math.round(req.body.capacityRequested * trip.pricePerTon * 100) / 100,
      respondBy,
    });

    await ChatThread.create({ booking: booking._id, participants: [booking.shipper, trip.transporter] });

    await notify(trip.transporter, "new_booking_request", { bookingId: booking._id, tripId: trip._id });

    res.status(201).json({ success: true, msg: "Booking request sent", booking });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

// FR-06.5 / SRS-05.2 — atomic conditional decrement so two concurrent
// accepts can never overbook a trip. SRS-02.3's shipper verification gate
// (off by default, admin-configurable) would apply here, at confirmation,
// not at request time — but with it off, getBooking exposes the shipper's
// real verification status instead, so the transporter accepting sees who
// they're dealing with and decides for themselves.
const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    const trip = await Trip.findById(booking.trip);
    if (!trip || String(trip.transporter) !== req.auth.id) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    await expireIfStale(booking);
    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, msg: `Booking is already ${booking.status}` });
    }

    const settings = await PlatformSetting.getSettings();
    if (settings.verificationGateEnabled) {
      const shipperKyc = await Verification.findOne({ user: booking.shipper, type: "shipper" });
      if (!shipperKyc || shipperKyc.status !== "verified") {
        return res.status(403).json({ success: false, msg: "This shipper hasn't completed verification yet" });
      }
    }

    const acceptFilter = { _id: trip._id, availableCapacity: { $gte: booking.capacityRequested } };
    const acceptInc = { availableCapacity: -booking.capacityRequested };
    const updatedTrip = await Trip.findOneAndUpdate(acceptFilter, { $inc: acceptInc }, { new: true });
    if (!updatedTrip) {
      return res.status(409).json({ success: false, msg: "Not enough capacity left on this trip to accept" });
    }
    if (updatedTrip.availableCapacity === 0) {
      updatedTrip.status = "full";
      await updatedTrip.save();
    }

    booking.status = "confirmed";
    await booking.save();

    await notify(booking.shipper, "booking_confirmed", { bookingId: booking._id, tripId: trip._id });

    // SRS-08.2 — SMS fallback for booking-confirmed is a Must-have. A
    // delivery failure (bad credentials, provider outage) must never fail
    // the accept action itself, which has already been saved above.
    try {
      const shipper = await User.findById(booking.shipper).select("mobile name email");
      if (shipper) {
        // Mobile is optional now — only SMS if they gave one.
        if (shipper.mobile) {
          await smsProvider.sendSms(
            shipper.mobile,
            `Your ${getBrandName()} booking (${trip.fromCity} to ${trip.toCity}) is confirmed. Check the app for pickup details.`
          );
        }
        if (shipper.email) {
          const { subject, html } = bookingConfirmedEmail({
            name: shipper.name,
            fromCity: trip.fromCity,
            toCity: trip.toCity,
            departureAt: trip.departureAt,
            capacityRequested: booking.capacityRequested,
            priceEstimate: booking.priceEstimate,
            bookingId: booking._id,
          });
          emailProvider.sendEmail({ to: shipper.email, subject, html }).catch((err) => console.error("booking_confirmed email failed:", err.message));
        }
      }
    } catch (smsError) {
      console.error("booking_confirmed SMS failed:", smsError.message);
    }

    res.status(200).json({ success: true, msg: "Booking confirmed", booking });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

const rejectBooking = async (req, res) => {
  try {
    const { error } = rejectBookingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    const trip = await Trip.findById(booking.trip);
    if (!trip || String(trip.transporter) !== req.auth.id) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    await expireIfStale(booking);
    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, msg: `Booking is already ${booking.status}` });
    }

    booking.status = "rejected";
    booking.rejectReason = req.body.reason;
    await booking.save();

    await notify(booking.shipper, "booking_rejected", { bookingId: booking._id, tripId: trip._id, reason: booking.rejectReason });

    res.status(200).json({ success: true, msg: "Booking rejected", booking });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

// SRS-05.6 — either party may cancel a Confirmed booking within the
// cancellation window; capacity releases back to the trip.
const cancelBooking = async (req, res) => {
  try {
    const { error } = cancelBookingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    const trip = await Trip.findById(booking.trip);
    const isShipper = String(booking.shipper) === req.auth.id;
    const isTransporter = trip && String(trip.transporter) === req.auth.id;
    if (!isShipper && !isTransporter) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ success: false, msg: `Only a confirmed booking can be cancelled (currently ${booking.status})` });
    }

    const cutoff = new Date(trip.departureAt.getTime() - CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000);
    if (new Date() > cutoff) {
      return res.status(400).json({
        success: false,
        msg: `Cancellations must be made at least ${CANCELLATION_WINDOW_HOURS} hours before departure`,
      });
    }

    await markBookingCancelled(booking, {
      cancelledBy: req.auth.id,
      reason: req.body.reason,
    });

    // Atomic $inc rather than a read-then-write on the already-loaded
    // `trip` — two bookings on the same trip being cancelled at nearly the
    // same time must not clobber each other's capacity release. The status
    // flip below is idempotent (both racers would write the same target
    // value), so it doesn't need the same treatment.
    const releaseInc = { availableCapacity: booking.capacityRequested };
    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: trip._id },
      { $inc: releaseInc },
      { new: true }
    );
    if (updatedTrip && updatedTrip.status === "full") {
      updatedTrip.status = "published";
      await updatedTrip.save();
    }

    const otherParty = isShipper ? trip.transporter : booking.shipper;
    await notify(otherParty, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });

    res.status(200).json({ success: true, msg: "Booking cancelled", booking });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

// FR-06.7 — Ongoing begins at pickup confirmation, either party may confirm.
const confirmPickup = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    const trip = await Trip.findById(booking.trip);
    const isParty = String(booking.shipper) === req.auth.id || (trip && String(trip.transporter) === req.auth.id);
    if (!isParty) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ success: false, msg: `Booking must be confirmed to start (currently ${booking.status})` });
    }

    booking.status = "ongoing";
    booking.pickupConfirmedAt = new Date();
    await booking.save();

    const otherParty = String(booking.shipper) === req.auth.id ? trip.transporter : booking.shipper;
    await notify(otherParty, "booking_pickup_confirmed", { bookingId: booking._id });

    res.status(200).json({ success: true, msg: "Pickup confirmed — booking is now ongoing", booking });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

// FR-06.7 — Completed begins at drop confirmation, either party may confirm.
const confirmDrop = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    const trip = await Trip.findById(booking.trip);
    const isParty = String(booking.shipper) === req.auth.id || (trip && String(trip.transporter) === req.auth.id);
    if (!isParty) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    if (booking.status !== "ongoing") {
      return res.status(400).json({ success: false, msg: `Booking must be ongoing to complete (currently ${booking.status})` });
    }

    booking.status = "completed";
    booking.dropConfirmedAt = new Date();
    await booking.save();

    if (trip) {
      const remainingActive = await Booking.countDocuments({ trip: trip._id, status: { $in: ["confirmed", "ongoing"] } });
      if (remainingActive === 0 && trip.status !== "cancelled") {
        trip.status = "completed";
        await trip.save();
      }
    }

    const otherParty = String(booking.shipper) === req.auth.id ? trip.transporter : booking.shipper;
    await notify(otherParty, "booking_completed", { bookingId: booking._id });
    await notify(booking.shipper, "rating_prompt", { bookingId: booking._id });
    await notify(trip.transporter, "rating_prompt", { bookingId: booking._id });

    res.status(200).json({ success: true, msg: "Drop confirmed — booking completed", booking });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

// FR-06.8 — My Bookings, segmented by status; role picks which side of the
// booking this account is querying as (a user may hold both roles).
const listMyBookings = async (req, res) => {
  try {
    const { role = "shipper", status, tripId } = req.query;

    let filter;
    if (role === "transporter") {
      const myTrips = await Trip.find({ transporter: req.auth.id }).select("_id");
      const myTripIds = myTrips.map((t) => String(t._id));
      if (tripId) {
        // A caller-supplied tripId must never replace the ownership check —
        // only narrow within trips this transporter actually owns.
        if (!myTripIds.includes(String(tripId))) {
          return res.status(200).json({ success: true, bookings: [] });
        }
        filter = { trip: tripId };
      } else {
        filter = { trip: { $in: myTripIds } };
      }
    } else {
      filter = { shipper: req.auth.id };
      if (tripId) filter.trip = tripId;
    }

    await expireStalePendingBookings(filter);

    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate({ path: "trip", populate: { path: "truck", select: "truckType regNumber" } })
      .populate("shipper", "name city ratingAvg")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: "trip", populate: [{ path: "truck" }, { path: "transporter", select: "name city ratingAvg" }] })
      .populate("shipper", "name city ratingAvg");
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    await expireIfStale(booking);

    const isShipper = String(booking.shipper._id) === req.auth.id;
    const isTransporter = String(booking.trip.transporter._id) === req.auth.id;
    if (!isShipper && !isTransporter && !req.auth.isAdmin) {
      return res.status(403).json({ success: false, msg: "Forbidden" });
    }

    // Just the booleans, not either party's KYC documents/history — same
    // boundary as tripController.getTrip's transporterVerified field.
    const [shipperKyc, transporterKyc] = await Promise.all([
      Verification.findOne({ user: booking.shipper._id, type: "shipper" }).select("status"),
      Verification.findOne({ user: booking.trip.transporter._id, type: "transporter" }).select("status"),
    ]);
    const bookingWithVerification = {
      ...booking.toObject(),
      shipperVerified: shipperKyc?.status === "verified",
      transporterVerified: transporterKyc?.status === "verified",
    };

    res.status(200).json({ success: true, booking: bookingWithVerification });
  } catch (error) {
    sendServerError(res, error, "bookingController");
  }
};

module.exports = {
  createBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  confirmPickup,
  confirmDrop,
  listMyBookings,
  getBooking,
  expireStalePendingBookings,
};
