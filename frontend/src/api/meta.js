import { api } from "./client";

export const searchCities = (q) => api.get(`/meta/cities?q=${encodeURIComponent(q)}`);

// Public — the display-safe subset of PlatformSetting (name/logo/favicon/
// contact), fetched once on app mount by BrandingContext.
export const getBranding = () => api.get("/meta/branding");
