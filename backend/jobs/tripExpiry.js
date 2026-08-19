const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");
const { notify } = require("../utils/notify");

// A published/full trip whose departure has come and gone stays exactly
// that way forever otherwise — nothing in tripController.js transitions a
// trip out of "published"/"full" based on departureAt (only booking
// lifecycle events and explicit transporter actions do). Left unchecked, a
// stale trip keeps showing in the transporter's "Published" list and stays
// matchable by searchTrips/bookable via TripDetail long after its truck
// has left.
//
// Skips a trip with an active (confirmed/ongoing) booking — mirrors
// bookingController.confirmDrop's own "any active bookings left?" check —
// since that's goods actually committed/moving, not an abandoned listing;
// a stale *pending* request on it is already handled separately by
// jobs/staleBookings.js.
const expireStaleTrips = async () => {
  const staleTrips = await Trip.find({
    status: { $in: ["published", "full"] },
    departureAt: { $lt: new Date() },
  });

  let expiredCount = 0;
  await Promise.all(
    staleTrips.map(async (trip) => {
      const activeCount = await Booking.countDocuments({ trip: trip._id, status: { $in: ["confirmed", "ongoing"] } });
      if (activeCount > 0) return;

      trip.status = "expired";
      await trip.save();
      expiredCount += 1;
      await notify(trip.transporter, "trip_expired", {
        tripId: trip._id,
        fromCity: trip.fromCity,
        toCity: trip.toCity,
      });
    })
  );
  return expiredCount;
};

module.exports = { expireStaleTrips };
