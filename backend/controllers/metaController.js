const sendServerError = require("../utils/sendServerError");
const { searchCities } = require("../utils/indiaCities");
const PlatformSetting = require("../models/platformSettingModel");

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

// Public — only the display-safe subset of PlatformSetting (name/logo/
// favicon/contact), never the sms/email/kyc integration blocks. This is
// what every page fetches on load to render the current
// brand identity; see utils/brandingCache.js for the backend's own
// synchronous mirror of these same fields (used in emails/SMS/push).
const getBranding = async (req, res) => {
  try {
    const settings = await PlatformSetting.getSettings();
    res.status(200).json({
      success: true,
      branding: {
        platformName: settings.platformName || "Truckgee",
        logoUrl: settings.logoUrl || "",
        faviconUrl: settings.faviconUrl || "",
        contactEmail: settings.contactEmail || "",
        contactMobile: settings.contactMobile || "",
        facebookUrl: settings.facebookUrl || "",
        instagramUrl: settings.instagramUrl || "",
        linkedinUrl: settings.linkedinUrl || "",
        youtubeUrl: settings.youtubeUrl || "",
      },
    });
  } catch (error) {
    sendServerError(res, error, "metaController");
  }
};

module.exports = { listCities, getVapidPublicKey, getBranding };
