const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");
const TripLocationPing = require("../models/tripLocationPingModel");
const { emitToRoom } = require("../realtime/io");
const { canViewTripLocation } = require("../utils/tripLocationAuth");
const { postLocationValidation } = require("../validators/tripLocationValidation");
const sendServerError = require("../utils/sendServerError");

// Called by the transporter's device roughly every ~8s while a trip is
// being actively tracked. Persists the ping (for the trail + audit),
// updates Trip.currentLocation (fast-read snapshot), then fans the update
// out over the trip's Socket.IO room — REST-in/socket-out, the same split
// chat messages already use (see realtime/chatHandlers.js), since sockets
// here have no validation/rate-limiting layer of their own.
const postLocation = async (req, res) => {
  try {
    const { error, value } = postLocationValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip || String(trip.transporter) !== req.auth.id) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }

    const hasOngoingBooking = await Booking.exists({ trip: trip._id, status: "ongoing" });
    if (!hasOngoingBooking) {
      return res.status(400).json({ success: false, msg: "This trip has no active leg to track right now" });
    }

    const { lat, lng, accuracy, heading, speed } = value;
    const recordedAt = new Date();

    await TripLocationPing.create({
      trip: trip._id,
      reportedBy: req.auth.id,
      lat,
      lng,
      accuracy,
      heading,
      speed,
      recordedAt,
    });

    trip.currentLocation = {
      type: "Point",
      coordinates: [lng, lat],
      updatedAt: recordedAt,
      accuracy,
      heading,
      speed,
    };
    await trip.save();

    emitToRoom(`trip:${trip._id}`, "trip:location", {
      tripId: String(trip._id),
      lat,
      lng,
      accuracy,
      heading,
      speed,
      recordedAt,
    });

    res.status(200).json({ success: true, msg: "Location updated" });
  } catch (error) {
    sendServerError(res, error, "tripLocationController");
  }
};

// The initial snapshot a viewer's map loads before/alongside joining the
// live socket room — the current position plus a short recent trail.
const getLocation = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }

    const allowed = await canViewTripLocation(trip, req.auth);
    if (!allowed) {
      return res.status(403).json({ success: false, msg: "Forbidden" });
    }

    const recentPings = await TripLocationPing.find({ trip: trip._id })
      .sort({ recordedAt: -1 })
      .limit(50)
      .select("lat lng recordedAt -_id");

    res.status(200).json({
      success: true,
      currentLocation: trip.currentLocation || null,
      recentPings: recentPings.reverse(), // oldest -> newest, ready to draw as a trail
    });
  } catch (error) {
    sendServerError(res, error, "tripLocationController");
  }
};

module.exports = { postLocation, getLocation };
