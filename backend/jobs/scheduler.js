const cron = require("node-cron");
const { sendTripDepartureReminders } = require("./tripReminders");
const { sweepStaleBookings } = require("./staleBookings");
const { expireStaleTrips } = require("./tripExpiry");

// Every 15 minutes is frequent enough that a trip departing in ~24h is
// caught well within the reminder window without needing a per-trip timer.
const startScheduler = () => {
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        const count = await sendTripDepartureReminders();
        if (count) console.log(`[scheduler] sent departure reminders for ${count} trip(s)`);
      } catch (error) {
        console.error("[scheduler] trip reminder job failed:", error.message);
      }
    },
    { name: "trip-departure-reminders", noOverlap: true }
  );

  // SRS-05.4 backstop — the controller expires stale pending bookings lazily
  // on every read, which covers everything anyone is actually looking at;
  // this sweep catches the ones nobody ever reads again.
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        const count = await sweepStaleBookings();
        if (count) console.log(`[scheduler] expired ${count} stale pending booking(s)`);
      } catch (error) {
        console.error("[scheduler] stale booking sweep failed:", error.message);
      }
    },
    { name: "sweep-stale-bookings", noOverlap: true }
  );

  // A trip whose departure has passed with nobody actively booked on it
  // otherwise sits in "published"/"full" forever — see jobs/tripExpiry.js.
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        const count = await expireStaleTrips();
        if (count) console.log(`[scheduler] expired ${count} stale trip(s)`);
      } catch (error) {
        console.error("[scheduler] trip expiry sweep failed:", error.message);
      }
    },
    { name: "expire-stale-trips", noOverlap: true }
  );
};

module.exports = startScheduler;
