import { api } from "./client";

export const searchCities = (q) => api.get(`/meta/cities?q=${encodeURIComponent(q)}`);

// Public — the display-safe subset of PlatformSetting, fetched once on app
// mount by BrandingContext.
export const getBranding = () => api.get("/meta/branding");

// Public — app-version gate (backend/controllers/metaController.js's
// getMobileConfig). RootLayout checks this on launch, before anything else,
// to decide whether the app can run as-is, should nudge an update, or must
// block on a force-update/maintenance screen.
export const getMobileConfig = () => api.get("/meta/mobile-config");
