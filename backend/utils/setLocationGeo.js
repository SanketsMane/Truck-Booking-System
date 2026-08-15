// Keeps a locationPointSchema() field's GeoJSON `location` shadow in sync
// with its plain `lat`/`lng` — called wherever pickupPoint/dropPoint is set
// (tripController.postTrip/editTrip). Mutates the passed object in place
// and returns it, so it composes with a plain object literal being built
// for Trip.create()/findOneAndUpdate() without an extra assignment.
const setLocationGeo = (point) => {
  if (!point) return point;
  if (point.lat != null && point.lng != null) {
    point.location = { type: "Point", coordinates: [point.lng, point.lat] };
  } else {
    point.location = undefined;
  }
  return point;
};

module.exports = setLocationGeo;
