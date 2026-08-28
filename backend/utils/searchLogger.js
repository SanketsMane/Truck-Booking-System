const crypto = require("crypto");
const SearchLog = require("../models/searchLogModel");

// SearchResults.jsx re-fires GET /trips/search on every sort and capacity
// change, and the mobile app does the same — so one shipper toggling
// "price" then "rating" would otherwise land in the log as three separate
// people wanting that lane. Within this window the same identity searching
// the same route+date updates the existing row (bumping refineCount)
// instead of inserting a new one, which keeps "most searched routes" a
// count of intent rather than a count of HTTP requests.
//
// Kept deliberately short. Refining is something a shipper does in the
// seconds after a search, not half an hour later, and the identity this
// folds on is only approximate for logged-out visitors (see
// anonymousIdentity) — a long window would start merging genuinely
// different people behind one office NAT into a single search, which
// undercounts the demand number the whole module exists to report.
const REFINE_WINDOW_MINUTES = 5;

// Rotates the anonymous identity hash daily. Long enough that the refine
// window above always falls inside one bucket, short enough that the hash
// can't be used to follow one visitor across weeks — unique-searcher counts
// are per-day approximations by design, not a durable visitor id.
const IDENTITY_BUCKET_MS = 24 * 60 * 60 * 1000;

const MAX_USER_AGENT = 200;

// A logged-out visitor still has to be countable — otherwise "1,200
// searches" could be twelve hundred people or one scraper, and the two need
// very different responses. Hashing (ip + user-agent + day + server secret)
// gives a stable-for-a-day key without the raw IP ever reaching the
// database: the hash isn't reversible, and it stops being linkable to
// anything once the day's bucket rolls over.
//
// This is deliberately an APPROXIMATION, not a visitor id. Two people on
// the same network running the same browser build share a key, and one
// person on phone-then-laptop counts as two. The honest alternative is a
// first-party analytics cookie, which is a product/privacy decision (this
// app ships no cookie policy today) rather than an implementation one — so
// unique-searcher counts are presented as approximate in the admin UI, and
// the refine window above is kept short so a collision costs at most a
// merged row, never a systematically inflated one.
const anonymousIdentity = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const agent = req.headers["user-agent"] || "";
  const bucket = Math.floor(Date.now() / IDENTITY_BUCKET_MS);
  const secret = process.env.SECRET_KEY || "dev-only-fallback";
  return crypto.createHash("sha256").update(`${ip}|${agent}|${bucket}|${secret}`).digest("hex").slice(0, 32);
};

// The mobile app already identifies itself on every request (see
// mobile/src/api/client.js's X-Client-Type, which is what makes login
// return bearer tokens) — reusing that header means neither client needs a
// single line of change to be attributable here.
const detectSource = (req) => {
  const client = String(req.headers["x-client-type"] || "").toLowerCase();
  if (client === "mobile") return "mobile";
  if (req.headers.origin || req.headers.referer) return "web";
  return "unknown";
};

// A user can hold both roles; the search intent differs per role, so pick
// the one that's actually doing the searching. A shipper looking for
// capacity is the common case, so it wins a tie.
const primaryRole = (auth) => {
  if (!auth) return "guest";
  if (auth.isAdmin) return "admin";
  const roles = auth.roles || [];
  if (roles.includes("shipper")) return "shipper";
  if (roles.includes("transporter")) return "transporter";
  return "guest";
};

const normalizeCity = (value) => String(value || "").trim().toLowerCase();

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// Whole days between the search and the date being searched for. Rounded,
// not floored: a search at 11pm for tomorrow morning is a 1-day lead time,
// not 0.
const leadTimeInDays = (travelDate, now) => {
  if (!travelDate) return null;
  return Math.round((travelDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
};

// Called from tripController.searchTrips AFTER the response has been sent.
// Everything here is best-effort: analytics must never turn a working
// search into a 500, and must never add latency to one either. Any failure
// is swallowed on purpose — a lost telemetry row is not worth a broken
// search page.
const recordTripSearch = async (req, { searchType, searchDate, matched = [] }) => {
  try {
    const now = new Date();
    const query = req.query || {};

    const fromCity = searchType === "route" ? String(query.fromCity || "").trim() : "";
    const toCity = searchType === "route" ? String(query.toCity || "").trim() : "";
    const fromCityNormalized = normalizeCity(fromCity);
    const toCityNormalized = normalizeCity(toCity);
    const routeKey =
      searchType === "route" && fromCityNormalized && toCityNormalized
        ? `${fromCityNormalized}|${toCityNormalized}`
        : null;

    const identityKey = req.auth?.id || anonymousIdentity(req);
    const resultCount = matched.length;
    const exactResultCount = matched.filter((m) => m.matchType === "exact").length;
    const travelDate = searchDate instanceof Date && !Number.isNaN(searchDate.getTime()) ? searchDate : null;

    // The half of the document that changes between two runs of the same
    // search — the searcher may have narrowed capacity or flipped the sort,
    // and the latest state is the one worth keeping.
    const refinements = {
      minCapacity: Number(query.minCapacity) || 0,
      sort: String(query.sort || "departure"),
      rangeDays: toFiniteNumber(query.rangeDays) ?? null,
      resultCount,
      exactResultCount,
      zeroResults: resultCount === 0,
      lastSearchedAt: now,
    };

    // findOneAndUpdate rather than find-then-save: two of these can race on
    // a double-fired request, and letting Mongo do the match+update in one
    // round trip means the loser updates the same row instead of inserting
    // a duplicate one.
    const refined = await SearchLog.findOneAndUpdate(
      {
        identityKey,
        routeKey,
        searchType,
        travelDate,
        createdAt: { $gte: new Date(now.getTime() - REFINE_WINDOW_MINUTES * 60 * 1000) },
      },
      { $set: refinements, $inc: { refineCount: 1 } },
      { sort: { createdAt: -1 } }
    );

    if (refined) return;

    await SearchLog.create({
      searchType,
      user: req.auth?.id || null,
      role: primaryRole(req.auth),
      identityKey,
      fromCity,
      toCity,
      fromCityNormalized,
      toCityNormalized,
      routeKey,
      fromLat: toFiniteNumber(query.fromLat),
      fromLng: toFiniteNumber(query.fromLng),
      toLat: toFiniteNumber(query.toLat),
      toLng: toFiniteNumber(query.toLng),
      nearLat: toFiniteNumber(query.nearLat),
      nearLng: toFiniteNumber(query.nearLng),
      radiusKm: toFiniteNumber(query.radiusKm),
      travelDate,
      leadTimeDays: leadTimeInDays(travelDate, now),
      source: detectSource(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, MAX_USER_AGENT),
      ...refinements,
    });
  } catch (error) {
    // Deliberately not sendServerError — the response is already out the
    // door by the time this runs, so there's nothing left to fail into.
    console.error("[searchLogger] failed to record search:", error.message);
  }
};

module.exports = { recordTripSearch, REFINE_WINDOW_MINUTES };
