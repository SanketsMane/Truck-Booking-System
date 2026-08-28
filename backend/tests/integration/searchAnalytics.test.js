const request = require("supertest");
const app = require("../../app");
const SearchLog = require("../../models/searchLogModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `searchlog${seed}@example.test`;

// tripController.searchTrips records the search AFTER the response is sent
// and deliberately doesn't await it — that's the whole point (analytics
// must never add latency to a search). So the assertion has to wait for the
// write to land rather than assume it already has; polling on the real
// collection is honest about that, where a fixed sleep would be both slower
// and flakier.
const waitForLogs = async (expected, filter = {}) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const count = await SearchLog.countDocuments(filter);
    if (count >= expected) return count;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return SearchLog.countDocuments(filter);
};

const searchFor = (fromCity, toCity, date, agent = request(app)) =>
  agent.get("/trips/search").query({ fromCity, toCity, date });

beforeEach(async () => {
  await disableVerificationGate();
});

describe("search logging", () => {
  it("records a guest route search with normalized cities and the result count", async () => {
    const { agent: transporter } = await signupUser(app, { email: emailFor(1), name: "T1", roles: ["transporter"] });
    const trip = await postTestTrip(transporter, { fromCity: "Pune", toCity: "Nashik" });

    const res = await searchFor("  PUNE ", "nashik", new Date(trip.departureAt).toISOString());
    expect(res.status).toBe(200);

    await waitForLogs(1);
    const log = await SearchLog.findOne({ searchType: "route" });

    expect(log.routeKey).toBe("pune|nashik");
    expect(log.fromCityNormalized).toBe("pune");
    expect(log.toCityNormalized).toBe("nashik");
    expect(log.resultCount).toBe(1);
    expect(log.exactResultCount).toBe(1);
    expect(log.zeroResults).toBe(false);
    expect(log.role).toBe("guest");
    expect(log.user).toBeNull();
    // The raw IP is never stored — only the rotating hash it feeds.
    expect(log.identityKey).toEqual(expect.any(String));
    expect(JSON.stringify(log.toObject())).not.toContain("127.0.0.1");
  });

  it("flags a search that returned nothing — the demand-gap signal", async () => {
    const res = await searchFor("Jaipur", "Guwahati", new Date(Date.now() + 86400000).toISOString());
    expect(res.status).toBe(200);
    expect(res.body.trips).toHaveLength(0);

    await waitForLogs(1);
    const log = await SearchLog.findOne({ routeKey: "jaipur|guwahati" });

    expect(log.zeroResults).toBe(true);
    expect(log.resultCount).toBe(0);
  });

  it("attributes a signed-in shipper's search to their account and role", async () => {
    const { agent: shipper, user } = await signupUser(app, { email: emailFor(2), name: "S1", roles: ["shipper"] });

    await searchFor("Pune", "Nagpur", new Date(Date.now() + 86400000).toISOString(), shipper);

    await waitForLogs(1);
    const log = await SearchLog.findOne({ routeKey: "pune|nagpur" });

    expect(String(log.user)).toBe(String(user._id));
    expect(log.role).toBe("shipper");
  });

  it("folds a re-fired search (sort/filter change) into one row instead of counting it twice", async () => {
    const date = new Date(Date.now() + 86400000).toISOString();
    const agent = request.agent(app);

    await agent.get("/trips/search").query({ fromCity: "Surat", toCity: "Indore", date });
    await waitForLogs(1, { routeKey: "surat|indore" });
    await agent.get("/trips/search").query({ fromCity: "Surat", toCity: "Indore", date, sort: "price" });
    await agent.get("/trips/search").query({ fromCity: "Surat", toCity: "Indore", date, sort: "rating" });

    // Give the two refines time to land before asserting on the count.
    for (let i = 0; i < 60; i += 1) {
      const doc = await SearchLog.findOne({ routeKey: "surat|indore" });
      if (doc?.refineCount >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const rows = await SearchLog.find({ routeKey: "surat|indore" });
    expect(rows).toHaveLength(1);
    expect(rows[0].refineCount).toBe(2);
    // The latest refinement's state is what's kept.
    expect(rows[0].sort).toBe("rating");
  });

  it("keeps two different visitors on the same lane as two separate searches", async () => {
    const date = new Date(Date.now() + 86400000).toISOString();

    await request(app).get("/trips/search").set("User-Agent", "visitor-a").query({ fromCity: "Agra", toCity: "Kanpur", date });
    await request(app).get("/trips/search").set("User-Agent", "visitor-b").query({ fromCity: "Agra", toCity: "Kanpur", date });

    await waitForLogs(2, { routeKey: "agra|kanpur" });
    const rows = await SearchLog.find({ routeKey: "agra|kanpur" });

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.refineCount === 0)).toBe(true);
  });

  it("records a near-me search as searchType 'near' with no route key", async () => {
    await request(app)
      .get("/trips/search")
      .query({ nearLat: 18.52, nearLng: 73.85, date: new Date(Date.now() + 86400000).toISOString() });

    await waitForLogs(1);
    const log = await SearchLog.findOne({});

    expect(log.searchType).toBe("near");
    expect(log.routeKey).toBeNull();
  });

  it("does not fail the search itself when logging cannot write", async () => {
    const spy = jest.spyOn(SearchLog, "findOneAndUpdate").mockRejectedValue(new Error("mongo down"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await searchFor("Kota", "Bhopal", new Date(Date.now() + 86400000).toISOString());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    spy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("GET /admin/search-analytics", () => {
  // One shared fixture per test: three searches on Pune→Nashik (served),
  // two on Kolkata→Kochi (nothing posted — the gap lane).
  const seedSearches = async () => {
    const { agent: transporter } = await signupUser(app, { email: emailFor(9), name: "T9", roles: ["transporter"] });
    const trip = await postTestTrip(transporter, { fromCity: "Pune", toCity: "Nashik" });
    const servedDate = new Date(trip.departureAt).toISOString();
    const gapDate = new Date(Date.now() + 3 * 86400000).toISOString();

    // A logged-out visitor's identity is hashed from ip + user-agent (see
    // utils/searchLogger.js), and every supertest request shares 127.0.0.1
    // — so distinct agents alone would still collapse into ONE identity and
    // its refine window. Varying the user-agent is what actually makes
    // these read as five different people, which is also what distinguishes
    // them in production.
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .get("/trips/search")
        .set("User-Agent", `visitor-served-${i}`)
        .query({ fromCity: "Pune", toCity: "Nashik", date: servedDate });
    }
    for (let i = 0; i < 2; i += 1) {
      await request(app)
        .get("/trips/search")
        .set("User-Agent", `visitor-gap-${i}`)
        .query({ fromCity: "Kolkata", toCity: "Kochi", date: gapDate });
    }

    await waitForLogs(5);
    return { trip };
  };

  const adminAgent = async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(10), name: "Admin", roles: [] });
    await makeAdmin(user);
    return agent;
  };

  it("rejects a non-admin", async () => {
    const { agent } = await signupUser(app, { email: emailFor(11), name: "Nobody", roles: ["shipper"] });
    const res = await agent.get("/admin/search-analytics/summary");
    expect(res.status).toBe(403);
  });

  it("summarises volume, unique searchers and the zero-result rate", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const res = await admin.get("/admin/search-analytics/summary");

    expect(res.status).toBe(200);
    expect(res.body.totals.searches).toBe(5);
    expect(res.body.totals.zeroResultSearches).toBe(2);
    expect(res.body.totals.zeroResultRate).toBeCloseTo(2 / 5);
    // Computed by its own pipeline rather than an $addToSet inside the
    // totals group (see uniqueSearchersStages) — asserted here so that
    // split stays wired to the same response field.
    expect(res.body.totals.uniqueSearchers).toBe(5);
    // Nothing was searched before this window, so the comparison baseline
    // is a real zeroed set rather than undefined.
    expect(res.body.previousTotals).toMatchObject({ searches: 0, uniqueSearchers: 0 });
    expect(res.body.distinctRoutes).toBe(2);
    expect(res.body.topRoutes[0]).toMatchObject({ routeKey: "pune|nashik", searches: 3 });
    expect(res.body.gapRoutes[0]).toMatchObject({ routeKey: "kolkata|kochi", zeroResultSearches: 2 });
  });

  it("ranks most-searched routes, and can re-rank by demand gap", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const byVolume = await admin.get("/admin/search-analytics/routes");
    expect(byVolume.status).toBe(200);
    expect(byVolume.body.items[0]).toMatchObject({
      routeKey: "pune|nashik",
      fromCity: "Pune",
      toCity: "Nashik",
      searches: 3,
      uniqueSearchers: 3,
      zeroResultSearches: 0,
      avgResults: 1,
    });
    expect(byVolume.body.total).toBe(2);

    const byGap = await admin.get("/admin/search-analytics/routes").query({ sort: "zeroResults" });
    expect(byGap.body.items[0].routeKey).toBe("kolkata|kochi");
    expect(byGap.body.items[0].zeroResultRate).toBe(1);

    const gapOnly = await admin.get("/admin/search-analytics/routes").query({ zeroOnly: "true" });
    expect(gapOnly.body.items.map((r) => r.routeKey)).toEqual(["kolkata|kochi"]);
  });

  it("filters routes by a free-text city on either endpoint", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const res = await admin.get("/admin/search-analytics/routes").query({ q: "kochi" });

    expect(res.body.items.map((r) => r.routeKey)).toEqual(["kolkata|kochi"]);
  });

  it("splits city demand into origins and destinations", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const res = await admin.get("/admin/search-analytics/cities");

    expect(res.status).toBe(200);
    expect(res.body.origins[0]).toMatchObject({ city: "Pune", searches: 3 });
    expect(res.body.destinations.map((c) => c.cityNormalized)).toEqual(expect.arrayContaining(["nashik", "kochi"]));
  });

  it("returns a gap-free daily trend covering the whole window", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const res = await admin.get("/admin/search-analytics/trends").query({ from: "2026-08-01", to: "2026-08-31" });

    expect(res.status).toBe(200);
    expect(res.body.trend).toHaveLength(31);
    expect(res.body.trend[0].day).toBe("2026-08-01");
    expect(res.body.trend.every((d) => typeof d.searches === "number")).toBe(true);
  });

  it("drills into one route with its demand history and its current supply", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const served = await admin.get("/admin/search-analytics/route-detail").query({ routeKey: "pune|nashik" });
    expect(served.status).toBe(200);
    expect(served.body.summary.searches).toBe(3);
    expect(served.body.supply.publishedTrips).toBe(1);
    expect(served.body.supply.availableCapacity).toBe(20);
    expect(served.body.recentSearches).toHaveLength(3);

    const gap = await admin.get("/admin/search-analytics/route-detail").query({ routeKey: "kolkata|kochi" });
    expect(gap.body.summary.zeroResultSearches).toBe(2);
    expect(gap.body.supply.publishedTrips).toBe(0);
    expect(gap.body.travelDates.length).toBeGreaterThan(0);
  });

  it("rejects a route-detail request without a usable route key", async () => {
    const admin = await adminAgent();
    const res = await admin.get("/admin/search-analytics/route-detail").query({ routeKey: "pune" });
    expect(res.status).toBe(400);
  });

  it("lists the raw log without leaking the visitor identity hash", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const res = await admin.get("/admin/search-analytics/logs").query({ limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.items[0].identityKey).toBeUndefined();
  });

  it("exports both reports as CSV honouring the active filters", async () => {
    await seedSearches();
    const admin = await adminAgent();

    const routes = await admin.get("/admin/search-analytics/routes.csv").query({ zeroOnly: "true" });
    expect(routes.status).toBe(200);
    expect(routes.headers["content-type"]).toContain("text/csv");
    expect(routes.text).toContain("Kolkata");
    expect(routes.text).not.toContain("Nashik");

    const logs = await admin.get("/admin/search-analytics/logs.csv");
    expect(logs.status).toBe(200);
    expect(logs.text.split("\n")).toHaveLength(6);
  });
});
