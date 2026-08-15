const mongoose = require("mongoose");
const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");
const { notify } = require("../utils/notify");

// A confirmed booking left unpaid past its paymentDueBy auto-cancels —
// trip.availableCapacity is committed at accept time (before payment
// exists), so an unpaid booking left open indefinitely would otherwise
// squat on a transporter's capacity forever with nothing to reclaim it.
// No wallet refund needed here since these bookings were never paid by
// definition of the query filter.
//
// Each booking's claim + capacity release runs in one transaction (same
// atomic $inc pattern as bookingController.cancelBooking): the status flip
// is claimed atomically first, so a concurrent manual cancel on the same
// booking can't also process it, and a crash between the status flip and
// the capacity release can no longer strand that capacity forever — either
// both happen or neither does.
const cancelUnpaidExpiredBookings = async () => {
  const now = new Date();

  const dueBookings = await Booking.find({
    status: "confirmed",
    paymentStatus: "unpaid",
    paymentDueBy: { $lt: now },
  });

  let cancelledCount = 0;

  for (const booking of dueBookings) {
    const session = await mongoose.startSession();
    try {
      let trip = null;
      await session.withTransaction(async () => {
        const claimed = await Booking.findOneAndUpdate(
          { _id: booking._id, status: "confirmed", paymentStatus: "unpaid" },
          { $set: { status: "cancelled", cancelReason: "Payment deadline expired" } },
          { new: true, session }
        );
        if (!claimed) return;

        const currentTrip = await Trip.findById(claimed.trip).session(session);
        if (!currentTrip) return;

        const releaseInc = { availableCapacity: claimed.capacityRequested };
        if (currentTrip.availableVolumeCbm != null && claimed.volumeRequested) {
          releaseInc.availableVolumeCbm = claimed.volumeRequested;
        }
        trip = await Trip.findOneAndUpdate({ _id: currentTrip._id }, { $inc: releaseInc }, { new: true, session });
        if (trip.status === "full") {
          trip.status = "published";
          await trip.save({ session });
        }
      });

      if (trip) {
        cancelledCount += 1;
        await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
        await notify(trip.transporter, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
      }
    } finally {
      await session.endSession();
    }
  }

  return cancelledCount;
};

module.exports = { cancelUnpaidExpiredBookings };
