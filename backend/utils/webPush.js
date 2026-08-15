const webpush = require("web-push");
const PushSubscription = require("../models/pushSubscriptionModel");

// Deliberately NOT read at module-require time: server.js requires every
// route file (which transitively requires this, via notify.js) before it
// calls dotenv.config() — reading process.env.VAPID_* here at the top level
// would permanently freeze this to false. Same reason crypto.js reads
// ENCRYPTION_KEY lazily inside a function rather than at module scope.
let vapidConfigured = false;
const ensureVapidConfigured = () => {
  if (vapidConfigured) return true;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
  return true;
};

// Best-effort, same resilience contract as notify()/logAdminAction() — a
// push delivery failure must never surface as a failure of the action that
// triggered it. A 404/410 means the browser's own subscription is dead
// (uninstalled, storage cleared) — prune it so future sends don't keep
// retrying a permanently-gone endpoint.
const sendPushToUser = async (userId, { title, body, url }) => {
  if (!ensureVapidConfigured()) return;

  try {
    const subscriptions = await PushSubscription.find({ user: userId });
    if (!subscriptions.length) return;

    const payload = JSON.stringify({ title, body, url });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload
          );
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            console.error(`sendPushToUser() delivery failed for user ${userId}:`, error.message);
          }
        }
      })
    );
  } catch (error) {
    console.error(`sendPushToUser() failed for user ${userId}:`, error.message);
  }
};

module.exports = { sendPushToUser };
