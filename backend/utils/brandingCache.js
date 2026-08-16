const PlatformSetting = require("../models/platformSettingModel");

// Email/SMS/push copy is built synchronously today (e.g. welcomeEmail({name})
// isn't async, called inline from many controllers) — threading an async
// PlatformSetting.getSettings() DB read into every one of those call sites
// would be invasive. Instead: an in-memory mirror of the public branding
// fields, refreshed once at boot (server.js) and again synchronously the
// instant an admin saves branding (adminController.updateBranding), so every
// synchronous call site gets a plain getter with no new awaits and no
// staleness beyond "an admin just changed it this millisecond".
let cache = {
  platformName: "Truckgee",
  logoUrl: "",
  faviconUrl: "",
  contactEmail: "",
  contactMobile: "",
};

const refreshBrandingCache = async () => {
  const settings = await PlatformSetting.getSettings();
  cache = {
    platformName: settings.platformName || "Truckgee",
    logoUrl: settings.logoUrl || "",
    faviconUrl: settings.faviconUrl || "",
    contactEmail: settings.contactEmail || "",
    contactMobile: settings.contactMobile || "",
  };
  return cache;
};

const getBranding = () => cache;
const getBrandName = () => cache.platformName;
const getBrandContactEmail = () => cache.contactEmail;
const getBrandContactMobile = () => cache.contactMobile;

module.exports = {
  refreshBrandingCache,
  getBranding,
  getBrandName,
  getBrandContactEmail,
  getBrandContactMobile,
};
