// Shared embedded shape for a pickup/drop point: free-text address plus
// optional coordinates from the Mapbox-backed autocomplete (frontend
// components/ui/LocationAutocomplete.jsx). lat/lng stay null when the
// address was typed freehand rather than picked from a suggestion, so a
// plain-text pickup point — as this app has always allowed — still works.
//
// `location` is a GeoJSON shadow of lat/lng ({type, coordinates}), kept in
// sync by utils/setLocationGeo.js whenever lat/lng are set — MongoDB's
// $geoWithin/$near queries need a real GeoJSON field to index, not a pair
// of plain Number fields. The {address, lat, lng} contract itself doesn't
// change; `location` is purely additive, for indexing/search.
//
// A function, not a shared object literal, so each field (Trip.pickupPoint,
// Trip.dropPoint, Booking.pickupPoint) gets its own schema object; Mongoose
// mutates these internally, and reusing one literal across paths would let
// that mutation bleed across fields.
const locationPointSchema = () => ({
  address: { type: String, required: true, trim: true },
  lat: { type: Number, min: -90, max: 90 },
  lng: { type: Number, min: -180, max: 180 },
  location: {
    type: { type: String, enum: ["Point"] },
    coordinates: { type: [Number], default: undefined }, // [lng, lat] — GeoJSON order
  },
});

module.exports = locationPointSchema;
