const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");

// "Is this truck out on the road right now?" — the question behind every
// guard that must not let a vehicle's identity change mid-run. A shipper who
// booked MH12AB1234 has to still be looking at MH12AB1234 when it pulls up,
// and the trip record has to keep naming the vehicle that actually ran it.
//
// A truck counts as in flight when either:
//
//   (a) a booking on one of its trips is "ongoing" — pickup was confirmed,
//       so a load is physically aboard. This is the strongest signal and it
//       ignores the clock entirely: a run that left late is still a run.
//       Note the trip itself stays "published"/"full" throughout (see
//       bookingController.confirmPickup — only the BOOKING flips to
//       ongoing), which is why this can't be answered from Trip alone.
//
//   (b) a live trip has departed and the delivery time it promised hasn't
//       arrived yet. This covers the run nobody pressed a button on. With
//       no estimatedArrivalAt to go by, a departed trip counts as in flight
//       until it settles — jobs/tripExpiry.js retires a departed trip with
//       no active booking, so this resolves itself rather than sticking.
//
// Returns the blocking trip so callers can name it in the error ("MH12AB1234
// is on Pune -> Nashik until 28 Aug"), or null when the truck is free.
const findInFlightTrip = async (truckId) => {
  const now = new Date();

  const liveTrips = await Trip.find({
    truck: truckId,
    status: { $in: ["published", "full", "ongoing"] },
  }).select("fromCity toCity departureAt estimatedArrivalAt status");

  if (!liveTrips.length) return null;

  const ongoingBooking = await Booking.findOne({
    trip: { $in: liveTrips.map((trip) => trip._id) },
    status: "ongoing",
  }).select("trip");

  if (ongoingBooking) {
    return liveTrips.find((trip) => String(trip._id) === String(ongoingBooking.trip)) || liveTrips[0];
  }

  return (
    liveTrips.find(
      (trip) => trip.departureAt <= now && (trip.estimatedArrivalAt ? trip.estimatedArrivalAt >= now : true)
    ) || null
  );
};

module.exports = { findInFlightTrip };
