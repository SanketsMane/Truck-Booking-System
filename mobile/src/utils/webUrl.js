// The marketing site is web-only — used to link out to pages this app
// deliberately doesn't duplicate natively (Terms, Privacy: long legal text
// that must stay a single source of truth, not two copies that can drift
// out of sync with each other).
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://truckgee.com";
