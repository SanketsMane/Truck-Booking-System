const DeviceToken = require("../models/deviceTokenModel");

// Same lazy-init-not-at-require-time reasoning as webPush.js's
// ensureVapidConfigured — server.js requires every route file (which
// transitively requires this, via notify.js) before dotenv.config() runs,
// so reading process.env.FIREBASE_SERVICE_ACCOUNT_JSON at module scope
// would permanently freeze this to unconfigured. firebase-admin itself is
// also only required lazily inside the function, not at the top of this
// file, so a backend that never configures Firebase never pays the cost of
// initializing the SDK at all.
let messaging = null;
let fcmConfigured = false;
const ensureFcmConfigured = () => {
  if (fcmConfigured) return true;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return false;

  // eslint-disable-next-line global-require
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  messaging = admin.messaging();
  fcmConfigured = true;
  return true;
};

// Best-effort, same resilience contract as sendPushToUser()/notify() — a
// push delivery failure must never surface as a failure of the action that
// triggered it. Payload stays id-only (title/body/a url to navigate to,
// never KYC status detail or financial amounts) — same principle
// pushCopy()'s existing shape already follows for Web Push.
const sendFcmToUser = async (userId, { title, body, url }) => {
  if (!ensureFcmConfigured()) return;

  try {
    const devices = await DeviceToken.find({ user: userId });
    if (!devices.length) return;

    const response = await messaging.sendEachForMulticast({
      tokens: devices.map((d) => d.token),
      notification: { title, body },
      data: url ? { url } : undefined,
    });

    // A dead/uninstalled-app token will never succeed again — prune it so
    // future sends don't keep retrying it, mirroring webPush.js's 404/410
    // prune-on-dead-endpoint behavior. Any other failure (network blip, a
    // transient FCM-side error) is logged and left alone.
    const toPrune = [];
    response.responses.forEach((result, i) => {
      if (!result.success && result.error?.code === "messaging/registration-token-not-registered") {
        toPrune.push(devices[i]._id);
      } else if (!result.success) {
        console.error(`sendFcmToUser() delivery failed for user ${userId}:`, result.error?.message);
      }
    });
    if (toPrune.length) {
      await DeviceToken.deleteMany({ _id: { $in: toPrune } });
    }
  } catch (error) {
    console.error(`sendFcmToUser() failed for user ${userId}:`, error.message);
  }
};

module.exports = { sendFcmToUser };
