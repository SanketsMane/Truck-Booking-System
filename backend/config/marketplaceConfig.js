module.exports = {
  // No longer a filter applied by default. A search used to match only
  // departures within +/- this many days of the searched date, which meant a
  // shipper searching "20 Aug" never saw a truck running the exact same
  // lane on the 23rd — the route looked dead to them, and the transporter
  // lost a booking they had capacity for. Search now matches everything
  // departing from the searched day ONWARD (see tripController.searchTrips),
  // and this value survives only as the default width when a shipper
  // deliberately narrows the window themselves via the rangeDays param.
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
  // within this many km of the truck's path — e.g. Pune sits ~45km off the
  // Bangalore->Mumbai line, so a Pune->Mumbai search still surfaces that
  // truck.
  //
  // Widened from 75km so far fewer real matches get filtered out. It is
  // deliberately NOT unbounded: with no corridor at all every truck matches
  // every search, which doesn't free anybody up — it just buries the trucks
  // actually running a shipper's lane under dozens that aren't, and an
  // exact-lane match becomes impossible to spot. Exact from/to city matches
  // are always tagged matchType "exact" and rank ahead of corridor ones, so
  // widening this only ever ADDS options below the real matches.
  ROUTE_CORRIDOR_KM: 150,

  // Lets a pickup/drop point project slightly before the route's start or
  // past its end and still count as "along" it — a truck leaving from
  // central Bangalore can reasonably pick up from just outside the city
  // without that point being rejected purely for landing a few km outside
  // the exact a->b segment.
  ROUTE_ENDPOINT_SLACK_KM: 60,

  // How many intermediate stops a transporter can add to one trip. The cap
  // exists only so one document can't grow unbounded — each stop is an
  // embedded point with its own GeoJSON shadow, and search walks every
  // segment of the resulting path — not to limit what a real run can do.
  MAX_TRIP_STOPS: 10,

  // Search matches everything departing from the searched day onward, but
  // the query still needs SOME upper bound or a coordinate-based search
  // (which has no city filter to narrow on and does its corridor maths in
  // JS) would load every future trip ever posted into memory. Four months
  // is far past anything a real transporter schedules, so this bounds the
  // query without being a limit anyone can actually hit.
  SEARCH_FORWARD_HORIZON_DAYS: 120,

  // Single-region assumptions, collected here so a future second
  // region/currency is a config edit instead of a grep-and-replace across
  // smsProvider/authValidation/indiaCities.
  DEFAULT_COUNTRY_CODE: "IN",
  PHONE_CALLING_CODE: "91",
  DEFAULT_CURRENCY: "INR",
  MOBILE_PATTERN: /^[6-9]\d{9}$/,
};
