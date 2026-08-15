const Booking = require("../models/bookingModel");

// Who's allowed to see a trip's live position: its transporter, an admin,
// or a shipper with a confirmed/ongoing booking on it (confirmed is
// included, not just ongoing, so a shipper can watch the truck approach
// pickup — not only after it). Shared by the REST GET /trips/:id/location
// endpoint and the trip:join socket handler so both enforce the identical
// rule rather than two hand-copied versions drifting apart.
const canViewTripLocation = async (trip, auth) => {
  if (!trip || !auth) return false;
  if (auth.isAdmin) return true;
  if (String(trip.transporter) === auth.id) return true;

  const hasActiveBooking = await Booking.exists({
    trip: trip._id,
    shipper: auth.id,
    status: { $in: ["confirmed", "ongoing"] },
  });
  return Boolean(hasActiveBooking);
};

module.exports = { canViewTripLocation };
