const mongoose = require("mongoose");

const SearchLog = require("../models/searchLogModel");
const Trip = require("../models/tripModel");
const escapeRegex = require("../utils/escapeRegex");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const { sendCsv } = require("../utils/csv");
const sendServerError = require("../utils/sendServerError");

// Every date bucket in this module is an India calendar day, matching the
// same IST assumption tripController.searchTrips already makes when it
// parses a shipper's "20 Aug". Bucketing in UTC instead would split each
// Indian evening's searches across two rows in the trend chart.
const TIMEZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 730;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_CITIES_LIMIT = 12;
const ROUTE_DETAIL_RECENT_LIMIT = 20;
const CSV_ROW_LIMIT = 5000;

// A plain YYYY-MM-DD from a date input means "this India calendar day", so
// the start anchors at IST midnight and the end at the last instant of that
// IST day — parsing either directly with `new Date()` would anchor at UTC
// and quietly shift the whole window by 5½ hours.
const startOfIstDay = (value) => new Date(`${value}T00:00:00${IST_OFFSET}`);
const endOfIstDay = (value) => new Date(`${value}T23:59:59.999${IST_OFFSET}`);
const istDayString = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);

// Resolves the {from, to} query pair into a concrete window, plus the
// equally-long window immediately before it — every KPI on the summary card
// shows a period-over-period delta, and "the same number of days, ending
// where this window starts" is the only comparison that isn't misleading.
const resolveRange = (query) => {
  const now = new Date();
  const hasTo = /^\d{4}-\d{2}-\d{2}$/.test(query.to || "");
  const hasFrom = /^\d{4}-\d{2}-\d{2}$/.test(query.from || "");

  const end = hasTo ? endOfIstDay(query.to) : now;
  let start = hasFrom ? startOfIstDay(query.from) : new Date(end.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

  if (start > end) start = new Date(end.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  // A hand-typed "from=1990-01-01" would otherwise make every aggregation
  // below scan the entire collection.
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    start = new Date(end.getTime() - MAX_RANGE_DAYS * DAY_MS);
  }

  const spanMs = end.getTime() - start.getTime();
  return {
    start,
    end,
    days: Math.max(1, Math.round(spanMs / DAY_MS)),
    previous: { start: new Date(start.getTime() - spanMs), end: start },
  };
};

// The shared $match every aggregation and list in this module starts from.
// Kept in one place so a filter added to the toolbar behaves identically on
// the routes table, the trend chart, the raw log, and the CSV export —
// otherwise an admin exporting "zero-result searches, mobile only" would
// silently get a different set of rows than the table showed them.
const buildMatch = (query, range) => {
  const match = { createdAt: { $gte: range.start, $lte: range.end } };

  if (query.source && ["web", "mobile", "unknown"].includes(query.source)) {
    match.source = query.source;
  }
  if (query.role && ["shipper", "transporter", "admin", "guest"].includes(query.role)) {
    match.role = query.role;
  }
  if (query.searchType && ["route", "near"].includes(query.searchType)) {
    match.searchType = query.searchType;
  }
  if (query.zeroOnly === "true") {
    match.zeroResults = true;
  }
  if (query.loggedIn === "true") match.user = { $ne: null };
  if (query.loggedIn === "false") match.user = null;

  // Drives "what has this account been searching for?" on the admin user
  // detail page. Guarded rather than passed through — an unparseable id
  // would otherwise throw a CastError out of the aggregation instead of
  // simply matching nothing.
  if (query.userId && mongoose.isValidObjectId(query.userId)) {
    match.user = new mongoose.Types.ObjectId(String(query.userId));
  }

  if (query.fromCity) match.fromCityNormalized = String(query.fromCity).trim().toLowerCase();
  if (query.toCity) match.toCityNormalized = String(query.toCity).trim().toLowerCase();
  if (query.routeKey) match.routeKey = String(query.routeKey);

  // The toolbar's free-text box searches EITHER endpoint — an operator
  // typing "nagpur" wants every lane touching Nagpur, in or out, not to
  // have to decide which end they meant first.
  if (query.q) {
    const re = new RegExp(escapeRegex(String(query.q).trim()), "i");
    match.$or = [{ fromCityNormalized: re }, { toCityNormalized: re }];
  }

  return match;
};

// Route analytics only make sense for from→to searches — a "near me" search
// has no destination, so it would group under a null key and show up as a
// phantom top lane.
const routeOnly = (match) => ({ ...match, searchType: "route", routeKey: { $ne: null } });

// $divide throws on a zero denominator, which for an empty bucket is the
// normal case rather than an error.
const safeRatio = (numerator, denominator) => ({
  $cond: [{ $gt: [denominator, 0] }, { $divide: [numerator, denominator] }, 0],
});

const ROUTE_SORTS = {
  // Default. Ties broken by reach, so a lane 40 different people searched
  // outranks one the same person searched 40 times.
  searches: { searches: -1, uniqueSearchers: -1 },
  searchers: { uniqueSearchers: -1, searches: -1 },
  // The demand-gap view. Absolute count first, not rate: a lane with one
  // search and one zero-result is a 100% failure rate but tells you nothing,
  // while 60 failed searches on one lane is a transporter to go recruit.
  zeroResults: { zeroResultSearches: -1, zeroResultRate: -1 },
  zeroRate: { zeroResultRate: -1, zeroResultSearches: -1 },
  avgResults: { avgResults: 1, searches: -1 },
  recent: { lastSearchedAt: -1 },
};

// One row per lane. Everything the routes table shows is derived here in a
// single pass rather than by N follow-up queries per row.
const routeGroupStages = [
  {
    $group: {
      _id: "$routeKey",
      // Every document in this group normalizes to the same city pair, so
      // any one of their display spellings is a correct label — the group
      // key is the normalized pair, never this field.
      fromCity: { $first: "$fromCity" },
      toCity: { $first: "$toCity" },
      searches: { $sum: 1 },
      // Raw HTTP hits, including every sort/filter re-fire the refine
      // window folded into an existing row. Shown alongside `searches` so
      // "12 searches / 31 requests" reads as engagement, not inflation.
      requests: { $sum: { $add: [1, "$refineCount"] } },
      searchers: { $addToSet: "$identityKey" },
      zeroResultSearches: { $sum: { $cond: ["$zeroResults", 1, 0] } },
      totalResults: { $sum: "$resultCount" },
      totalExactResults: { $sum: "$exactResultCount" },
      lastSearchedAt: { $max: "$lastSearchedAt" },
      firstSearchedAt: { $min: "$createdAt" },
      avgLeadTimeDays: { $avg: "$leadTimeDays" },
    },
  },
  {
    $project: {
      _id: 0,
      routeKey: "$_id",
      fromCity: 1,
      toCity: 1,
      searches: 1,
      requests: 1,
      uniqueSearchers: { $size: "$searchers" },
      zeroResultSearches: 1,
      zeroResultRate: safeRatio("$zeroResultSearches", "$searches"),
      avgResults: { $round: [safeRatio("$totalResults", "$searches"), 2] },
      // Results that matched the lane itself rather than merely passing
      // through its corridor. A lane with results but no exact matches is
      // effectively unserved — the corridor matcher is papering over it.
      exactResults: "$totalExactResults",
      avgLeadTimeDays: { $round: [{ $ifNull: ["$avgLeadTimeDays", 0] }, 1] },
      lastSearchedAt: 1,
      firstSearchedAt: 1,
    },
  },
];

// ---------------------------------------------------------------------------
// Summary KPIs
// ---------------------------------------------------------------------------

const periodTotalsStages = [
  {
    $group: {
      _id: null,
      searches: { $sum: 1 },
      requests: { $sum: { $add: [1, "$refineCount"] } },
      zeroResultSearches: { $sum: { $cond: ["$zeroResults", 1, 0] } },
      totalResults: { $sum: "$resultCount" },
      signedIn: { $sum: { $cond: [{ $ne: ["$user", null] }, 1, 0] } },
    },
  },
  {
    $project: {
      _id: 0,
      searches: 1,
      requests: 1,
      zeroResultSearches: 1,
      zeroResultRate: safeRatio("$zeroResultSearches", "$searches"),
      avgResults: { $round: [safeRatio("$totalResults", "$searches"), 2] },
      signedInShare: safeRatio("$signedIn", "$searches"),
    },
  },
];

// Counted by grouping ON the identity and counting the groups, NOT with an
// $addToSet inside the totals group above. The per-route and per-day
// aggregations can safely use $addToSet — their groups hold at most a few
// thousand keys each — but this one spans every search in the window, and a
// single group accumulating a million 32-character hashes into one array
// blows past the 16MB document limit and fails the whole request. Grouping
// by identity keeps each group tiny and lets $count do the work.
const uniqueSearchersStages = [{ $group: { _id: "$identityKey" } }, { $count: "count" }];

const EMPTY_TOTALS = {
  searches: 0,
  requests: 0,
  zeroResultSearches: 0,
  zeroResultRate: 0,
  avgResults: 0,
  signedInShare: 0,
};

// The two halves are computed by separate pipelines (see
// uniqueSearchersStages) but are one number set to every caller.
const withSearchers = (totals, searchersFacet) => ({
  ...(totals || EMPTY_TOTALS),
  uniqueSearchers: searchersFacet?.[0]?.count || 0,
});

const getSearchSummary = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    const match = buildMatch(req.query, range);
    const previousMatch = { ...match, createdAt: { $gte: range.previous.start, $lt: range.previous.end } };

    const [result] = await SearchLog.aggregate([
      { $match: match },
      {
        $facet: {
          totals: periodTotalsStages,
          uniqueSearchers: uniqueSearchersStages,
          distinctRoutes: [{ $match: { searchType: "route", routeKey: { $ne: null } } }, { $group: { _id: "$routeKey" } }, { $count: "count" }],
          topRoutes: [{ $match: { searchType: "route", routeKey: { $ne: null } } }, ...routeGroupStages, { $sort: ROUTE_SORTS.searches }, { $limit: 5 }],
          gapRoutes: [
            { $match: { searchType: "route", routeKey: { $ne: null } } },
            ...routeGroupStages,
            { $match: { zeroResultSearches: { $gt: 0 } } },
            { $sort: ROUTE_SORTS.zeroResults },
            { $limit: 5 },
          ],
          bySource: [{ $group: { _id: "$source", searches: { $sum: 1 } } }, { $sort: { searches: -1 } }],
          byRole: [{ $group: { _id: "$role", searches: { $sum: 1 } } }, { $sort: { searches: -1 } }],
        },
      },
    ]);

    // A second, separate aggregation rather than another $facet branch: the
    // previous period is a different $match entirely, and $facet can only
    // ever narrow the one set of documents its parent stage already matched.
    const [previous] = await SearchLog.aggregate([
      { $match: previousMatch },
      { $facet: { totals: periodTotalsStages, uniqueSearchers: uniqueSearchersStages } },
    ]);

    res.status(200).json({
      success: true,
      range: { from: range.start, to: range.end, days: range.days },
      totals: withSearchers(result?.totals?.[0], result?.uniqueSearchers),
      previousTotals: withSearchers(previous?.totals?.[0], previous?.uniqueSearchers),
      distinctRoutes: result?.distinctRoutes?.[0]?.count || 0,
      topRoutes: result?.topRoutes || [],
      gapRoutes: result?.gapRoutes || [],
      bySource: result?.bySource || [],
      byRole: result?.byRole || [],
      retentionDays: SearchLog.RETENTION_DAYS,
    });
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

// ---------------------------------------------------------------------------
// Top routes
// ---------------------------------------------------------------------------

const listTopRoutes = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    const { page, limit, skip } = getPagination(req.query);
    const sortKey = ROUTE_SORTS[req.query.sort] ? req.query.sort : "searches";
    const minSearches = Math.max(0, parseInt(req.query.minSearches, 10) || 0);

    const [result] = await SearchLog.aggregate([
      { $match: routeOnly(buildMatch(req.query, range)) },
      ...routeGroupStages,
      ...(minSearches > 1 ? [{ $match: { searches: { $gte: minSearches } } }] : []),
      {
        // Paginating a grouped result needs both the page and the grouped
        // total, and re-running the whole group just to count it would
        // double the work — $facet computes both from one pass.
        $facet: {
          items: [{ $sort: ROUTE_SORTS[sortKey] }, { $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const items = result?.items || [];
    const total = result?.total?.[0]?.count || 0;

    res.status(200).json({
      success: true,
      ...paginatedResponse(items, total, page, limit),
      range: { from: range.start, to: range.end, days: range.days },
      sort: sortKey,
    });
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

// ---------------------------------------------------------------------------
// City demand
// ---------------------------------------------------------------------------

// Origin and destination demand are genuinely different questions — a city
// everyone ships FROM needs transporters based there, a city everyone ships
// TO needs return-load capacity — so they're two lists, not one.
const cityStages = (field, displayField) => [
  { $match: { [field]: { $nin: [null, ""] } } },
  {
    $group: {
      _id: `$${field}`,
      city: { $first: `$${displayField}` },
      searches: { $sum: 1 },
      searchers: { $addToSet: "$identityKey" },
      zeroResultSearches: { $sum: { $cond: ["$zeroResults", 1, 0] } },
      routes: { $addToSet: "$routeKey" },
    },
  },
  {
    $project: {
      _id: 0,
      city: 1,
      cityNormalized: "$_id",
      searches: 1,
      uniqueSearchers: { $size: "$searchers" },
      zeroResultSearches: 1,
      zeroResultRate: safeRatio("$zeroResultSearches", "$searches"),
      routes: { $size: "$routes" },
    },
  },
  { $sort: { searches: -1, city: 1 } },
  { $limit: TOP_CITIES_LIMIT },
];

const listTopCities = async (req, res) => {
  try {
    const range = resolveRange(req.query);

    const [result] = await SearchLog.aggregate([
      { $match: routeOnly(buildMatch(req.query, range)) },
      {
        $facet: {
          origins: cityStages("fromCityNormalized", "fromCity"),
          destinations: cityStages("toCityNormalized", "toCity"),
        },
      },
    ]);

    res.status(200).json({
      success: true,
      origins: result?.origins || [],
      destinations: result?.destinations || [],
      range: { from: range.start, to: range.end, days: range.days },
    });
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

// Mongo only returns days that HAVE documents. A chart drawn straight from
// that silently closes the gaps, turning a quiet weekend into a straight
// line between Friday and Monday — so every missing day is filled with an
// explicit zero here instead.
const fillDays = (rows, start, end) => {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const filled = [];
  const cursor = new Date(start.getTime());

  while (cursor <= end && filled.length <= MAX_RANGE_DAYS) {
    const day = istDayString(cursor);
    filled.push(byDay.get(day) || { day, searches: 0, zeroResultSearches: 0, uniqueSearchers: 0, avgResults: 0 });
    cursor.setTime(cursor.getTime() + DAY_MS);
  }

  return filled;
};

const getSearchTrends = async (req, res) => {
  try {
    const range = resolveRange(req.query);

    const rows = await SearchLog.aggregate([
      { $match: buildMatch(req.query, range) },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } },
          searches: { $sum: 1 },
          zeroResultSearches: { $sum: { $cond: ["$zeroResults", 1, 0] } },
          searchers: { $addToSet: "$identityKey" },
          totalResults: { $sum: "$resultCount" },
        },
      },
      {
        $project: {
          _id: 0,
          day: "$_id",
          searches: 1,
          zeroResultSearches: 1,
          uniqueSearchers: { $size: "$searchers" },
          avgResults: { $round: [safeRatio("$totalResults", "$searches"), 2] },
        },
      },
      { $sort: { day: 1 } },
    ]);

    res.status(200).json({
      success: true,
      trend: fillDays(rows, range.start, range.end),
      range: { from: range.start, to: range.end, days: range.days },
    });
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

// ---------------------------------------------------------------------------
// Raw log
// ---------------------------------------------------------------------------

const listSearchLogs = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    const match = buildMatch(req.query, range);
    const { page, limit, skip } = getPagination(req.query);

    const [items, total] = await Promise.all([
      SearchLog.find(match)
        .populate("user", "name email mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        // identityKey is the anonymous-visitor hash — it exists to make
        // unique counts and the refine window work, and has no reason to
        // leave the server even for an admin.
        .select("-identityKey"),
      SearchLog.countDocuments(match),
    ]);

    res.status(200).json({
      success: true,
      ...paginatedResponse(items, total, page, limit),
      range: { from: range.start, to: range.end, days: range.days },
    });
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

// ---------------------------------------------------------------------------
// Per-route drill-down
// ---------------------------------------------------------------------------

const getRouteDetail = async (req, res) => {
  try {
    const routeKey = String(req.query.routeKey || "").trim();
    if (!routeKey.includes("|")) {
      return res.status(400).json({ success: false, msg: "routeKey is required, as 'fromcity|tocity'" });
    }

    const range = resolveRange(req.query);
    const [fromNormalized, toNormalized] = routeKey.split("|");
    const match = { ...buildMatch(req.query, range), searchType: "route", routeKey };

    const [result] = await SearchLog.aggregate([
      { $match: match },
      {
        $facet: {
          summary: routeGroupStages,
          trend: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } },
                searches: { $sum: 1 },
                zeroResultSearches: { $sum: { $cond: ["$zeroResults", 1, 0] } },
                searchers: { $addToSet: "$identityKey" },
                totalResults: { $sum: "$resultCount" },
              },
            },
            {
              $project: {
                _id: 0,
                day: "$_id",
                searches: 1,
                zeroResultSearches: 1,
                uniqueSearchers: { $size: "$searchers" },
                avgResults: { $round: [safeRatio("$totalResults", "$searches"), 2] },
              },
            },
            { $sort: { day: 1 } },
          ],
          // Which shipping dates the demand is actually for — the lane may
          // be busy overall while every search targets one festival week no
          // transporter has posted against.
          travelDates: [
            { $match: { travelDate: { $ne: null } } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$travelDate", timezone: TIMEZONE } },
                searches: { $sum: 1 },
                zeroResultSearches: { $sum: { $cond: ["$zeroResults", 1, 0] } },
              },
            },
            { $sort: { searches: -1, _id: 1 } },
            { $limit: 10 },
            { $project: { _id: 0, day: "$_id", searches: 1, zeroResultSearches: 1 } },
          ],
        },
      },
    ]);

    const [recentSearches, publishedTrips, upcomingCapacity] = await Promise.all([
      SearchLog.find(match)
        .populate("user", "name email mobile")
        .sort({ createdAt: -1 })
        .limit(ROUTE_DETAIL_RECENT_LIMIT)
        .select("-identityKey"),
      // The supply side of the same lane, so the drill-down answers "is
      // this lane underserved?" instead of only "is it popular?" — demand
      // numbers alone can't distinguish a hot lane from a broken one.
      Trip.countDocuments({
        fromCityNormalized: fromNormalized,
        toCityNormalized: toNormalized,
        status: "published",
        departureAt: { $gte: new Date() },
      }),
      Trip.aggregate([
        {
          $match: {
            fromCityNormalized: fromNormalized,
            toCityNormalized: toNormalized,
            status: "published",
            departureAt: { $gte: new Date() },
          },
        },
        { $group: { _id: null, capacity: { $sum: "$availableCapacity" }, transporters: { $addToSet: "$transporter" } } },
      ]),
    ]);

    const summary = result?.summary?.[0] || null;

    res.status(200).json({
      success: true,
      routeKey,
      route: {
        fromCity: summary?.fromCity || fromNormalized,
        toCity: summary?.toCity || toNormalized,
      },
      summary,
      trend: fillDays(result?.trend || [], range.start, range.end),
      travelDates: result?.travelDates || [],
      recentSearches,
      supply: {
        publishedTrips,
        availableCapacity: upcomingCapacity?.[0]?.capacity || 0,
        transporters: upcomingCapacity?.[0]?.transporters?.length || 0,
      },
      range: { from: range.start, to: range.end, days: range.days },
    });
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

// ---------------------------------------------------------------------------
// CSV exports
// ---------------------------------------------------------------------------

const percent = (ratio) => `${Math.round((ratio || 0) * 1000) / 10}%`;

// Both exports honour the SAME filters the on-screen table was using — an
// admin who filtered to "zero-result, mobile, last 7 days" and hit Export
// expects that file, not the whole collection.
const exportRoutesCsv = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    const sortKey = ROUTE_SORTS[req.query.sort] ? req.query.sort : "searches";
    const minSearches = Math.max(0, parseInt(req.query.minSearches, 10) || 0);

    const rows = await SearchLog.aggregate([
      { $match: routeOnly(buildMatch(req.query, range)) },
      ...routeGroupStages,
      ...(minSearches > 1 ? [{ $match: { searches: { $gte: minSearches } } }] : []),
      { $sort: ROUTE_SORTS[sortKey] },
      { $limit: CSV_ROW_LIMIT },
    ]);

    sendCsv(res, "search-routes.csv", rows, [
      { label: "From", value: (r) => r.fromCity },
      { label: "To", value: (r) => r.toCity },
      { label: "Searches", value: (r) => r.searches },
      { label: "Requests", value: (r) => r.requests },
      { label: "Unique searchers", value: (r) => r.uniqueSearchers },
      { label: "Zero-result searches", value: (r) => r.zeroResultSearches },
      { label: "Zero-result rate", value: (r) => percent(r.zeroResultRate) },
      { label: "Avg results", value: (r) => r.avgResults },
      { label: "Exact matches", value: (r) => r.exactResults },
      { label: "Avg lead time (days)", value: (r) => r.avgLeadTimeDays },
      { label: "First searched", value: (r) => (r.firstSearchedAt ? r.firstSearchedAt.toISOString() : "") },
      { label: "Last searched", value: (r) => (r.lastSearchedAt ? r.lastSearchedAt.toISOString() : "") },
    ]);
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

const exportSearchLogsCsv = async (req, res) => {
  try {
    const range = resolveRange(req.query);

    const rows = await SearchLog.find(buildMatch(req.query, range))
      .populate("user", "name email mobile")
      .sort({ createdAt: -1 })
      .limit(CSV_ROW_LIMIT)
      .select("-identityKey");

    sendCsv(res, "search-logs.csv", rows, [
      { label: "Searched at", value: (r) => r.createdAt.toISOString() },
      { label: "Type", value: (r) => r.searchType },
      { label: "From", value: (r) => r.fromCity },
      { label: "To", value: (r) => r.toCity },
      { label: "Travel date", value: (r) => (r.travelDate ? istDayString(r.travelDate) : "") },
      { label: "Lead time (days)", value: (r) => (r.leadTimeDays === null ? "" : r.leadTimeDays) },
      { label: "Results", value: (r) => r.resultCount },
      { label: "Exact matches", value: (r) => r.exactResultCount },
      { label: "Refinements", value: (r) => r.refineCount },
      { label: "Min capacity", value: (r) => r.minCapacity },
      { label: "Sort", value: (r) => r.sort },
      { label: "Role", value: (r) => r.role },
      { label: "User", value: (r) => r.user?.name || "Guest" },
      { label: "Email", value: (r) => r.user?.email || "" },
      { label: "Source", value: (r) => r.source },
    ]);
  } catch (error) {
    sendServerError(res, error, "searchLogController");
  }
};

module.exports = {
  getSearchSummary,
  listTopRoutes,
  listTopCities,
  getSearchTrends,
  listSearchLogs,
  getRouteDetail,
  exportRoutesCsv,
  exportSearchLogsCsv,
};
