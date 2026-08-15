module.exports = {
  // How many days either side of the searched date still count as a match
  // (SRS-04.1: "departure date falls within a configurable date-range
  // window of the searched date").
  SEARCH_DATE_RANGE_DAYS: 1,

  // A Pending request the transporter never actions auto-expires after this
  // many hours (SRS-05.4), capped at the trip's departure time.
  BOOKING_RESPONSE_WINDOW_HOURS: 24,

  // Confirmed MVP cancellation policy (closes the open question in FRD/SRS
  // Appendix B): free cancellation of a confirmed booking up to 6 hours
  // before departure, no monetary penalty either side. Kept as a single
  // constant so it's still easy to change if the policy is revisited later.
  CANCELLATION_WINDOW_HOURS: 6,

  // A confirmed booking left unpaid this long auto-cancels (jobs/paymentDeadlines.js)
  // — capacity is committed at accept time, before payment exists, so an
  // unpaid booking left open forever would squat on it indefinitely.
  PAYMENT_WINDOW_HOURS: 12,

  // Default radius for the optional nearLat/nearLng trip search mode
  // (tripController.searchTrips) when the caller doesn't specify radiusKm.
  SEARCH_RADIUS_KM_DEFAULT: 25,

  // Single-region assumptions, collected here so a future second
  // region/currency/gateway is a config edit instead of a grep-and-replace
  // across smsProvider/paymentModel/walletModel/authValidation/indiaCities.
  DEFAULT_COUNTRY_CODE: "IN",
  PHONE_CALLING_CODE: "91",
  DEFAULT_CURRENCY: "INR",
  MOBILE_PATTERN: /^[6-9]\d{9}$/,
};
