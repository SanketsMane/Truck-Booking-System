const cron = require("node-cron");
const { sendTripDepartureReminders } = require("./tripReminders");
const { cancelUnpaidExpiredBookings } = require("./paymentDeadlines");

// Every 15 minutes is frequent enough that a trip departing in ~24h is
// caught well within the reminder window without needing a per-trip timer.
const startScheduler = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const count = await sendTripDepartureReminders();
      if (count) console.log(`[scheduler] sent departure reminders for ${count} trip(s)`);
    } catch (error) {
      console.error("[scheduler] trip reminder job failed:", error.message);
    }
  });

  cron.schedule("*/15 * * * *", async () => {
    try {
      const count = await cancelUnpaidExpiredBookings();
      if (count) console.log(`[scheduler] auto-cancelled ${count} unpaid booking(s) past their payment deadline`);
    } catch (error) {
      console.error("[scheduler] payment deadline job failed:", error.message);
    }
  });
};

module.exports = startScheduler;
