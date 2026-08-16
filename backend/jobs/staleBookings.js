const { expireStalePendingBookings } = require("../controllers/bookingController");

// SRS-05.4 — a booking request the transporter never actioned auto-expires.
// The controller already applies this lazily on every read path, which
// catches every request anyone is actually looking at; this periodic sweep
// (see jobs/scheduler.js) is the backstop for the case nobody reads again —
// an abandoned trip, a transporter who never comes back — so a stale
// booking still expires within a bounded window instead of sitting
// "pending" forever.
const sweepStaleBookings = async () => expireStalePendingBookings({});

module.exports = { sweepStaleBookings };
