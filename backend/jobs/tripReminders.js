const Trip = require("../models/tripModel");
const Booking = require("../models/bookingModel");
const { notify } = require("../utils/notify");

const REMINDER_WINDOW_HOURS = 24;

// FR-09.1 — notify both the transporter and every confirmed shipper as a
// trip's departure approaches. Runs on a fixed interval (see jobs/scheduler)
// rather than scheduling one timer per trip.
//
// Each trip is claimed atomically (reminderSentAt set via findOneAndUpdate,
// guarded on it still being null) BEFORE any notification goes out — an
// overlapping run can't double-claim the same trip, and a crash mid-send
// just means this trip's reminder is silently skipped rather than
// re-sent to everyone on the next run.
const sendTripDepartureReminders = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const dueTrips = await Trip.find({
    status: { $in: ["published", "full"] },
    departureAt: { $gte: now, $lte: windowEnd },
    reminderSentAt: null,
  }).select("_id");

  let sentCount = 0;

  for (const { _id: tripId } of dueTrips) {
    const claimed = await Trip.findOneAndUpdate(
      { _id: tripId, reminderSentAt: null },
      { $set: { reminderSentAt: now } },
      { new: true }
    );
    if (!claimed) continue;

    const confirmedBookings = await Booking.find({
      trip: claimed._id,
      status: { $in: ["confirmed", "ongoing"] },
    }).select("shipper");

    const recipients = [claimed.transporter, ...confirmedBookings.map((b) => b.shipper)];
    await Promise.all(
      recipients.map((userId) =>
        notify(userId, "trip_departure_reminder", {
          tripId: claimed._id,
          fromCity: claimed.fromCity,
          toCity: claimed.toCity,
          departureAt: claimed.departureAt,
        })
      )
    );

    sentCount += 1;
  }

  return sentCount;
};

module.exports = { sendTripDepartureReminders, REMINDER_WINDOW_HOURS };
