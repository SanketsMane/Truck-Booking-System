const Booking = require("../models/bookingModel");

// Sum of capacityRequested across still-pending bookings per trip, in one
// aggregate query regardless of how many trips are being looked at (search
// results) or just one (trip detail). SRS-05.1 wants this reflected in what
// shippers see, not just enforced silently at booking-submit time.
const getPendingHeldMap = async (tripIds) => {
  if (!tripIds.length) return new Map();
  const rows = await Booking.aggregate([
    { $match: { trip: { $in: tripIds }, status: "pending" } },
    {
      $group: {
        _id: "$trip",
        capacity: { $sum: "$capacityRequested" },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), { capacity: r.capacity }]));
};

const visibleAvailable = (trip, heldMap) =>
  Math.max(0, trip.availableCapacity - (heldMap.get(String(trip._id))?.capacity || 0));

module.exports = { getPendingHeldMap, visibleAvailable };
