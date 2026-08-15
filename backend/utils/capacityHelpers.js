const Booking = require("../models/bookingModel");

// Sum of capacityRequested (and, where set, volumeRequested) across
// still-pending bookings per trip, in one aggregate query regardless of how
// many trips are being looked at (search results) or just one (trip
// detail). SRS-05.1 wants this reflected in what shippers see, not just
// enforced silently at booking-submit time.
const getPendingHeldMap = async (tripIds) => {
  if (!tripIds.length) return new Map();
  const rows = await Booking.aggregate([
    { $match: { trip: { $in: tripIds }, status: "pending" } },
    {
      $group: {
        _id: "$trip",
        capacity: { $sum: "$capacityRequested" },
        volume: { $sum: { $ifNull: ["$volumeRequested", 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), { capacity: r.capacity, volume: r.volume }]));
};

const visibleAvailable = (trip, heldMap) =>
  Math.max(0, trip.availableCapacity - (heldMap.get(String(trip._id))?.capacity || 0));

// Same idea for volume — returns null (not 0) when the trip doesn't track
// volume at all, so callers can tell "no volume figure set" apart from
// "zero volume left".
const visibleAvailableVolume = (trip, heldMap) => {
  if (trip.availableVolumeCbm == null) return null;
  return Math.max(0, trip.availableVolumeCbm - (heldMap.get(String(trip._id))?.volume || 0));
};

module.exports = { getPendingHeldMap, visibleAvailable, visibleAvailableVolume };
