// One-off backfill: populates fromCityNormalized/toCityNormalized and the
// pickupPoint.location GeoJSON shadow on any Trip document that predates
// those fields (see models/tripModel.js, utils/setLocationGeo.js). Idempotent
// — safe to re-run; only touches documents actually missing the new fields.
//
// Usage: node scripts/backfillCityNormalization.js

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({
  path: path.join(__dirname, "..", process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"),
});

const mongoose = require("mongoose");
const Trip = require("../models/tripModel");
const setLocationGeo = require("../utils/setLocationGeo");

(async () => {
  if (!process.env.MONGODB_URL) {
    console.error("MONGODB_URL is not set — nothing to connect to.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const trips = await Trip.find({
    $or: [{ fromCityNormalized: { $exists: false } }, { toCityNormalized: { $exists: false } }],
  });

  let updated = 0;
  for (const trip of trips) {
    trip.fromCityNormalized = trip.fromCity.trim().toLowerCase();
    trip.toCityNormalized = trip.toCity.trim().toLowerCase();
    if (trip.pickupPoint) setLocationGeo(trip.pickupPoint);
    if (trip.dropPoint) setLocationGeo(trip.dropPoint);
    await trip.save();
    updated += 1;
  }

  console.log(`Backfilled ${updated} trip(s) (of ${trips.length} found missing normalized city fields).`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
