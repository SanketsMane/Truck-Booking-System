const PushSubscription = require("../models/pushSubscriptionModel");
const { subscribePushValidation, unsubscribePushValidation } = require("../validators/pushValidation");
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

module.exports = { subscribe, unsubscribe };
