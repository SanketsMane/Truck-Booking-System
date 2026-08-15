const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");
const { notify } = require("../utils/notify");

const REMINDER_WINDOW_HOURS = 24;

// FR-09.1 — notify both the transporter and every confirmed shipper as a
// trip's departure approaches. Runs on a fixed interval (see jobs/scheduler)
// rather than scheduling one timer per trip, and reminderSentAt on the trip
// makes each run idempotent — a trip already reminded is never picked up
// again even if the job runs more often than the reminder window.
const sendTripDepartureReminders = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const dueTrips = await Trip.find({
    status: { $in: ["published", "full"] },
    departureAt: { $gte: now, $lte: windowEnd },
    reminderSentAt: null,
  });

  for (const trip of dueTrips) {
    const confirmedBookings = await Booking.find({
      trip: trip._id,
      status: { $in: ["confirmed", "ongoing"] },
    }).select("shipper");

    const recipients = [trip.transporter, ...confirmedBookings.map((b) => b.shipper)];
    await Promise.all(
      recipients.map((userId) =>
        notify(userId, "trip_departure_reminder", {
          tripId: trip._id,
          fromCity: trip.fromCity,
          toCity: trip.toCity,
          departureAt: trip.departureAt,
        })
      )
    );

    trip.reminderSentAt = now;
    await trip.save();
  }

  return dueTrips.length;
};

module.exports = { sendTripDepartureReminders, REMINDER_WINDOW_HOURS };
