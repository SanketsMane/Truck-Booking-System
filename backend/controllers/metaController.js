const sendServerError = require("../utils/sendServerError");
const { searchCities } = require("../utils/indiaCities");

// City-name autocomplete for the fromCity/toCity fields on the trip search
// and post-trip forms. Public, read-only, no auth needed.
const listCities = (req, res) => {
  try {
    const { q = "" } = req.query;
    const cities = searchCities(String(q), 10);
    res.status(200).json({ success: true, cities });
  } catch (error) {
    sendServerError(res, error, "metaController");
  }
};

// Public — the VAPID public key is, by design, safe to expose to any
// client (it's how the browser's PushManager verifies pushes actually
// came from this server's private key, not a secret in itself).
const getVapidPublicKey = (req, res) => {
  res.status(200).json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || null });
};

module.exports = { listCities, getVapidPublicKey };
