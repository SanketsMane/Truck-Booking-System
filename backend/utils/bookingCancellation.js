// Shared cancel logic for every path that can cancel a booking
// (shipper/transporter self-cancel, a trip-cancel cascading to its
// bookings, admin force-cancel).
//
// Capacity release (only relevant when the trip itself stays active — a
// cancelled trip's capacity no longer matters) and notifications are left
// to the caller, since those differ by context.
const markBookingCancelled = async (booking, { cancelledBy, reason }) => {
  booking.status = "cancelled";
  booking.cancelledBy = cancelledBy;
  booking.cancelReason = reason;
  await booking.save();
  return booking;
};

module.exports = { markBookingCancelled };
