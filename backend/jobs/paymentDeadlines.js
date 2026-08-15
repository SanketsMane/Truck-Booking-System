const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");
const { notify } = require("../utils/notify");

// A confirmed booking left unpaid past its paymentDueBy auto-cancels —
// trip.availableCapacity is committed at accept time (before payment
// exists), so an unpaid booking left open indefinitely would otherwise
// squat on a transporter's capacity forever with nothing to reclaim it.
// Same capacity-release logic as bookingController.cancelBooking; no wallet
// refund needed here since these bookings were never paid by definition of
// the query filter.
const cancelUnpaidExpiredBookings = async () => {
  const now = new Date();

  const dueBookings = await Booking.find({
    status: "confirmed",
    paymentStatus: "unpaid",
    paymentDueBy: { $lt: now },
  });

  for (const booking of dueBookings) {
    const trip = await Trip.findById(booking.trip);

    booking.status = "cancelled";
    booking.cancelReason = "Payment deadline expired";
    await booking.save();

    if (trip) {
      trip.availableCapacity += booking.capacityRequested;
      if (trip.status === "full") trip.status = "published";
      await trip.save();

      await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
      await notify(trip.transporter, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
    }
  }

  return dueBookings.length;
};

module.exports = { cancelUnpaidExpiredBookings };
