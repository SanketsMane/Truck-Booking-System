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

  // Default radius for the optional nearLat/nearLng trip search mode
  // (tripController.searchTrips) when the caller doesn't specify radiusKm.
  SEARCH_RADIUS_KM_DEFAULT: 25,

  // Route-corridor search (tripController.searchTrips, utils/routeGeo.js):
  // a shipper's pickup/drop point counts as "on" a truck's route if it's
  // within this many km of the truck's straight-line pickup->drop path —
  // e.g. Pune sits ~45km off the Bangalore->Mumbai line, well inside this,
  // so a Pune->Mumbai search still surfaces that truck. Generous enough to
  // catch real highway detours through a city near the line, not so wide
  // it starts matching genuinely unrelated routes.
  ROUTE_CORRIDOR_KM: 75,

  // Lets a pickup/drop point project slightly before the route's start or
  // past its end and still count as "along" it — a truck leaving from
  // central Bangalore can reasonably pick up from just outside the city
  // without that point being rejected purely for landing a few km outside
  // the exact a->b segment.
  ROUTE_ENDPOINT_SLACK_KM: 30,

  // Single-region assumptions, collected here so a future second
  // region/currency is a config edit instead of a grep-and-replace across
  // smsProvider/authValidation/indiaCities.
  DEFAULT_COUNTRY_CODE: "IN",
  PHONE_CALLING_CODE: "91",
  DEFAULT_CURRENCY: "INR",
  MOBILE_PATTERN: /^[6-9]\d{9}$/,
};
