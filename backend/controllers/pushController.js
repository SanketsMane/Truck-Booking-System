const PushSubscription = require("../models/pushSubscriptionModel");
const DeviceToken = require("../models/deviceTokenModel");
const {
  subscribePushValidation,
  unsubscribePushValidation,
  registerDeviceValidation,
  unregisterDeviceValidation,
} = require("../validators/pushValidation");
const sendServerError = require("../utils/sendServerError");

// Upsert by endpoint — a browser calling subscribe() again with the same
// endpoint (e.g. app reopened) should update which user it's tied to
// rather than create a duplicate row; a shared device where a different
// user subsequently subscribes correctly reassigns the endpoint to them.
const subscribe = async (req, res) => {
  try {
    const { error, value } = subscribePushValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    try {
      await PushSubscription.findOneAndUpdate(
        { endpoint: value.endpoint },
        { user: req.auth.id, endpoint: value.endpoint, keys: value.keys },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (upsertError) {
      // Two subscribe() calls for the same endpoint can race the upsert —
      // both see no existing doc and both attempt an insert, so the loser
      // hits the unique endpoint index instead of taking the update path.
      // The winner's insert already recorded this endpoint; retry as a
      // plain update so this request's user/keys still land (needed when
      // a shared device re-subscribes a different user to the same endpoint).
      if (upsertError.code !== 11000) throw upsertError;
      await PushSubscription.findOneAndUpdate(
        { endpoint: value.endpoint },
        { user: req.auth.id, endpoint: value.endpoint, keys: value.keys }
      );
    }

    res.status(200).json({ success: true, msg: "Subscribed to push notifications" });
  } catch (error) {
    sendServerError(res, error, "pushController");
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { error, value } = unsubscribePushValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    await PushSubscription.deleteOne({ endpoint: value.endpoint, user: req.auth.id });

    res.status(200).json({ success: true, msg: "Unsubscribed" });
  } catch (error) {
    sendServerError(res, error, "pushController");
  }
};

// The mobile app's counterpart to subscribe() — an FCM registration token
// instead of a Web Push endpoint+keys pair (see deviceTokenModel.js's own
// comment for why these are separate models). Same upsert-by-token,
// race-safe-on-duplicate-insert shape as subscribe() above: a device
// re-registering (app reopened, token rotated by the OS) reassigns the row
// rather than erroring, and a shared device where a different user
// subsequently registers correctly reassigns the token to them.
const registerDevice = async (req, res) => {
  try {
    const { error, value } = registerDeviceValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    try {
      await DeviceToken.findOneAndUpdate(
        { token: value.token },
        { user: req.auth.id, token: value.token, platform: value.platform, lastSeenAt: new Date() },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (upsertError) {
      if (upsertError.code !== 11000) throw upsertError;
      await DeviceToken.findOneAndUpdate(
        { token: value.token },
        { user: req.auth.id, token: value.token, platform: value.platform, lastSeenAt: new Date() }
      );
    }

    res.status(200).json({ success: true, msg: "Device registered for push notifications" });
  } catch (error) {
    sendServerError(res, error, "pushController");
  }
};

const unregisterDevice = async (req, res) => {
  try {
    const { error, value } = unregisterDeviceValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    await DeviceToken.deleteOne({ token: value.token, user: req.auth.id });

    res.status(200).json({ success: true, msg: "Device unregistered" });
  } catch (error) {
    sendServerError(res, error, "pushController");
  }
};

module.exports = { subscribe, unsubscribe, registerDevice, unregisterDevice };
