// Great-circle "how far off the truck's straight-line path is this point,
// and how far along that path does it fall" math — the geometry behind
// tripController.searchTrips's route-corridor matching (SRS-04: a shipper
// searching Pune->Mumbai should still find a Bangalore->Mumbai truck, since
// Pune sits close to that route, not just trucks whose exact origin is
// Pune). Pure math, no DB/framework dependency, so it's cheap to unit test
// and reuse anywhere else a "is this point near this route" check is
// needed later (e.g. a future "trucks near me, along my route" browse).

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

const angularDistance = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  // Clamped — floating-point error can push h fractionally above 1 for
  // near-identical points, which would otherwise make asin() return NaN.
  return 2 * Math.asin(Math.sqrt(Math.min(1, h)));
};

const bearing = (a, b) => {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return Math.atan2(y, x);
};

// For a route from `a` to `b` and an arbitrary point `p`, returns:
//   crossTrackKm — perpendicular distance of p from the great-circle line
//                  through a and b (always >= 0)
//   alongTrackKm — how far along that line, measured from a, p's closest
//                  point falls. 0 = at a, routeLengthKm = at b; negative
//                  means p projects "before" a, and a value greater than
//                  routeLengthKm means it projects "past" b — either way,
//                  p is off the actual a-to-b segment, not just off to the
//                  side of it.
//   routeLengthKm — the full a-to-b distance, handed back so callers don't
//                   need a second call to get it.
const distanceFromRoute = (a, b, p) => {
  const routeLengthKm = angularDistance(a, b) * EARTH_RADIUS_KM;
  const d13 = angularDistance(a, p);
  if (d13 === 0) return { crossTrackKm: 0, alongTrackKm: 0, routeLengthKm };

  const t13 = bearing(a, p);
  const t12 = bearing(a, b);
  const crossTrackKm = Math.asin(Math.sin(d13) * Math.sin(t13 - t12)) * EARTH_RADIUS_KM;
  const alongTrackKmMagnitude =
    Math.acos(Math.min(1, Math.cos(d13) / Math.cos(crossTrackKm / EARTH_RADIUS_KM))) * EARTH_RADIUS_KM;
  // acos always returns a magnitude (>= 0) — on its own this can't tell "p
  // projects behind a" from "p projects between a and b", both of which
  // land in the same positive range for a point close to the line. Signing
  // it by whether p's bearing from a points the same general direction as
  // the route (t12) or the opposite way is what actually lets a caller
  // reject a point that's near the route's line but behind its start.
  const alongTrackKm = Math.cos(t13 - t12) < 0 ? -alongTrackKmMagnitude : alongTrackKmMagnitude;

  return { crossTrackKm: Math.abs(crossTrackKm), alongTrackKm, routeLengthKm };
};

module.exports = { distanceFromRoute, EARTH_RADIUS_KM };
