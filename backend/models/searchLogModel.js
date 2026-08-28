const mongoose = require("mongoose");

// Every trip search a visitor runs (tripController.searchTrips) is recorded
// here so the admin console can answer "which lanes are people actually
// asking for?" — the DEMAND side of the marketplace, which Trip/Booking
// data alone can never show. A lane nobody ever posted capacity on leaves
// no trace in any other collection, yet that's exactly the lane worth
// recruiting transporters for; a search that returned zero trips is the
// single most actionable row in this whole database.
//
// Deliberately not an AuditLog entry: audit logs record ADMIN actions on a
// target document (actor/action/before/after), are read one row at a time,
// and are never aggregated. This is high-volume visitor telemetry that only
// matters in aggregate, needs its own retention window, and is grouped by
// route rather than by actor — different shape, different indexes.
const RETENTION_DAYS = Number(process.env.SEARCH_LOG_RETENTION_DAYS) || 365;

const searchLogSchema = new mongoose.Schema(
  {
    // "route" — a from→to city search (the one that produces route
    // analytics). "near" — the map-style "trucks near me" search, which has
    // no destination at all, so it's excluded from every route aggregation
    // and only counted in the volume/summary numbers.
    searchType: {
      type: String,
      enum: ["route", "near"],
      required: true,
      default: "route",
    },

    // Null for a logged-out visitor — the majority of searches on a
    // marketplace happen before signup, and dropping them would badly skew
    // "most searched routes" toward whatever existing users happen to do.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Role snapshot at search time, not derived from the User doc later — a
    // transporter who searches is scouting return loads, a shipper is
    // looking for capacity, and those two intents shouldn't be conflated in
    // the same demand number. "guest" for logged-out.
    role: {
      type: String,
      enum: ["shipper", "transporter", "admin", "guest"],
      default: "guest",
    },

    // What "one searcher" means for unique counts and for the refine-window
    // dedupe below: the user id when logged in, otherwise the rotating
    // anonymous hash from utils/searchLogger.js. Never a raw IP.
    identityKey: {
      type: String,
      required: true,
    },

    // Display strings exactly as typed/picked, so the admin table shows
    // "Pune" not "pune"...
    fromCity: { type: String, trim: true, default: "" },
    toCity: { type: String, trim: true, default: "" },

    // ...while grouping happens on the normalized shadow pair, same
    // convention tripModel.js already uses for fromCityNormalized — "Pune",
    // "pune " and "PUNE" have to collapse into one row in "most searched
    // routes" or the whole report is noise.
    fromCityNormalized: { type: String, default: "" },
    toCityNormalized: { type: String, default: "" },

    // "pune|mumbai" — the single grouping key for every route aggregation.
    // Stored rather than composed with $concat at query time so the group
    // stage can be served by a real index instead of a collection scan.
    routeKey: {
      type: String,
      default: null,
    },

    // Present only when the searcher picked a real autocomplete suggestion
    // rather than typing a bare city name (see api/trips.js) — lets the
    // route report plot demand on a map later without re-geocoding.
    fromLat: { type: Number },
    fromLng: { type: Number },
    toLat: { type: Number },
    toLng: { type: Number },

    // "near me" searches only.
    nearLat: { type: Number },
    nearLng: { type: Number },
    radiusKm: { type: Number },

    // The date the shipper wants to ship on — distinct from createdAt (when
    // they searched). Both matter: createdAt drives the volume trend,
    // travelDate drives "which weeks is demand concentrated in".
    travelDate: {
      type: Date,
      default: null,
    },

    // travelDate − createdAt, in whole days. Negative is possible (someone
    // browsing a past date). Answers "how far ahead do shippers plan?",
    // which decides how long a posted trip needs to stay visible.
    leadTimeDays: {
      type: Number,
      default: null,
    },

    // The optional refinements applied on top of the route itself.
    minCapacity: { type: Number, default: 0 },
    sort: { type: String, default: "departure" },
    rangeDays: { type: Number, default: null },

    // What the searcher actually got back.
    resultCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Of those results, how many matched the exact from/to city pair rather
    // than merely passing through the corridor (searchTrips' matchType).
    // A lane showing resultCount 6 / exactResultCount 0 looks healthy in the
    // totals but is really an unserved lane the corridor matcher is papering
    // over — worth surfacing separately.
    exactResultCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Denormalized resultCount === 0. Redundant by definition, but it's the
    // single most-filtered condition in this whole module (the demand-gap
    // report) and a boolean index is far cheaper than a range scan.
    zeroResults: {
      type: Boolean,
      default: false,
    },

    // How many times the SAME search was re-run inside the refine window —
    // SearchResults.jsx re-fires the request on every sort/capacity change,
    // so without this one shipper toggling "price" three times would look
    // like four separate people wanting that lane. The row stays one
    // search; this counts the fiddling.
    refineCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Updated on each refine, so "last searched" reflects the real end of
    // the session rather than its first request.
    lastSearchedAt: {
      type: Date,
      default: Date.now,
    },

    source: {
      type: String,
      enum: ["web", "mobile", "unknown"],
      default: "unknown",
    },

    // Truncated, and only ever used to tell a browser from the app and to
    // spot obvious scrapers. The raw IP is never stored — it exists only as
    // an ingredient of the rotating identityKey hash.
    userAgent: {
      type: String,
      default: "",
      maxlength: 200,
    },
  },
  { timestamps: true }
);

// The raw-log viewer's default sort, and the date-range $match every
// aggregation in searchLogController starts with.
searchLogSchema.index({ createdAt: -1 });
// Top-routes grouping, and the per-route drill-down's trend.
searchLogSchema.index({ routeKey: 1, createdAt: -1 });
// The demand-gap report: zero-result searches, newest first.
searchLogSchema.index({ zeroResults: 1, createdAt: -1 });
// "What has this user been searching for?" on the admin user detail page.
searchLogSchema.index({ user: 1, createdAt: -1 });
// The refine-window lookup in utils/searchLogger.js, which runs on the hot
// search path and must never turn into a scan.
searchLogSchema.index({ identityKey: 1, routeKey: 1, createdAt: -1 });

// Visitor telemetry has no reason to live forever — it's only ever queried
// over a trailing window, and an unbounded log of what every visitor looked
// for is a liability, not an asset. Mongo drops expired docs on its own,
// so nothing has to remember to prune. Changing SEARCH_LOG_RETENTION_DAYS
// on an existing deployment needs the index dropped and rebuilt (Mongo
// won't alter expireAfterSeconds in place from an index spec).
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

const SearchLog = mongoose.model("SearchLog", searchLogSchema);

module.exports = SearchLog;
// Surfaced in the admin UI's footnote ("logs older than N days are pruned
// automatically") so the retention window is visible where the data is read,
// not just in an env var nobody opens.
module.exports.RETENTION_DAYS = RETENTION_DAYS;
