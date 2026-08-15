const app = require("../../app");
const Booking = require("../../models/bookingModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `admlist${seed}@example.test`;

// Covers the bulk of the /admin listing + CRUD + reporting surface —
// listUsers/getUserDetail/listLiveTrips/listTrucks/listTrips/deactivateTrip/
// listBookings/forceCancelBooking/getSettings/updateSettings/
// updateCommission and the four CSV report endpoints. Admin finance/
// integration endpoints (wallets, withdrawals, integrations) are covered
// elsewhere. Imitates adminScopes.test.js's style throughout.
describe("admin listings, CRUD and reports", () => {
  beforeEach(async () => {
    await disableVerificationGate();
  });

  it("blocks a non-admin from every /admin/* route covered here with 403", async () => {
    const { agent } = await signupUser(app, { email: emailFor(1), name: "Plain Shipper", roles: ["shipper"] });
    const fakeId = "000000000000000000000000";

    const calls = [
      () => agent.get("/admin/users"),
      () => agent.get(`/admin/users/${fakeId}`),
      () => agent.get("/admin/live-trips"),
      () => agent.get("/admin/trucks"),
      () => agent.get("/admin/trips"),
      () => agent.put(`/admin/trips/${fakeId}/deactivate`).send({ reason: "x" }),
      () => agent.get("/admin/bookings"),
      () => agent.put(`/admin/bookings/${fakeId}/force-cancel`).send({ reason: "x" }),
      () => agent.get("/admin/settings"),
      () => agent.put("/admin/settings").send({ verificationGateEnabled: false }),
      () => agent.put("/admin/settings/commission").send({ commissionPercent: 5 }),
      () => agent.get("/admin/reports/bookings.csv"),
      () => agent.get("/admin/reports/revenue-by-route.csv"),
      () => agent.get("/admin/reports/user-growth.csv"),
      () => agent.get("/admin/reports/verification-turnaround.csv"),
    ];

    for (const call of calls) {
      const res = await call();
      expect(res.status).toBe(403);
    }
  });

  it("lists users with pagination shape and returns a specific user's detail", async () => {
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(10), name: "Admin" });
    await makeAdmin(adminUser, "full");
    const { user: target } = await signupUser(app, {
      email: emailFor(11),
      name: "Target Shipper",
      roles: ["shipper"],
    });

    const listRes = await adminAgent.get("/admin/users");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.total).toBeGreaterThanOrEqual(2);
    expect(listRes.body.page).toBe(1);
    expect(listRes.body).toHaveProperty("limit");
    expect(listRes.body).toHaveProperty("pages");
    expect(listRes.body.items.some((u) => String(u._id) === String(target._id))).toBe(true);

    const detailRes = await adminAgent.get(`/admin/users/${target._id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(String(detailRes.body.user._id)).toBe(String(target._id));
    expect(detailRes.body.user.email).toBe(emailFor(11));
    expect(detailRes.body).toHaveProperty("verifications");
    expect(detailRes.body).toHaveProperty("trucks");
    expect(detailRes.body).toHaveProperty("bookingsAsShipper");
    expect(detailRes.body).toHaveProperty("tripsAsTransporter");
  });

  it("returns 404 for getUserDetail on an id that doesn't exist", async () => {
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(12), name: "Admin" });
    await makeAdmin(adminUser, "full");

    const res = await adminAgent.get("/admin/users/000000000000000000000000");
    expect(res.status).toBe(404);
  });

  it("lists trucks and trips including a real seeded truck/trip, paginated", async () => {
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(20), name: "Admin" });
    await makeAdmin(adminUser, "full");
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(21),
      name: "Transporter",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(transporterAgent);

    const trucksRes = await adminAgent.get("/admin/trucks");
    expect(trucksRes.status).toBe(200);
    expect(trucksRes.body.success).toBe(true);
    expect(Array.isArray(trucksRes.body.items)).toBe(true);
    expect(trucksRes.body).toHaveProperty("total");
    expect(trucksRes.body).toHaveProperty("page");
    expect(trucksRes.body).toHaveProperty("pages");
    expect(trucksRes.body.items.some((t) => String(t._id) === String(trip.truck))).toBe(true);

    const tripsRes = await adminAgent.get("/admin/trips");
    expect(tripsRes.status).toBe(200);
    expect(tripsRes.body.success).toBe(true);
    expect(Array.isArray(tripsRes.body.items)).toBe(true);
    expect(tripsRes.body).toHaveProperty("total");
    expect(tripsRes.body.items.some((t) => String(t._id) === String(trip._id))).toBe(true);
  });

  it("lists bookings including a real seeded booking, paginated", async () => {
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(30), name: "Admin" });
    await makeAdmin(adminUser, "full");
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(31),
      name: "Transporter",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, {
      email: emailFor(32),
      name: "Shipper",
      roles: ["shipper"],
    });
    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 3, goodsDescription: "Bags of rice" });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.booking._id;

    const listRes = await adminAgent.get("/admin/bookings");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body).toHaveProperty("total");
    expect(listRes.body.items.some((b) => String(b._id) === String(bookingId))).toBe(true);
  });

  it("returns live trips only for trips with a recent GPS ping", async () => {
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(40), name: "Admin" });
    await makeAdmin(adminUser, "full");
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(41),
      name: "Transporter",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, {
      email: emailFor(42),
      name: "Shipper",
      roles: ["shipper"],
    });
    const trip = await postTestTrip(transporterAgent);

    // A trip with no location ping at all shouldn't show up in the live feed.
    const beforePing = await adminAgent.get("/admin/live-trips");
    expect(beforePing.status).toBe(200);
    expect(beforePing.body.success).toBe(true);
    expect(beforePing.body.trips.some((t) => String(t._id) === String(trip._id))).toBe(false);

    // Location updates require an "ongoing" booking on the trip (see
    // gpsAuth.test.js) — get a booking there via the real accept flow, then
    // force it to "ongoing" the same way that test file does.
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });
    const bookingId = bookingRes.body.booking._id;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);
    await Booking.updateOne({ _id: bookingId }, { $set: { status: "ongoing", paymentStatus: "paid" } });

    const pingRes = await transporterAgent.put(`/trips/${trip._id}/location`).send({ lat: 18.5, lng: 73.8 });
    expect(pingRes.status).toBe(200);

    const afterPing = await adminAgent.get("/admin/live-trips");
    expect(afterPing.status).toBe(200);
    expect(afterPing.body.trips.some((t) => String(t._id) === String(trip._id))).toBe(true);
  });

  it("deactivates a trip as a full-scope admin, and blocks a finance-scope admin with 403", async () => {
    const { agent: financeAdminAgent, user: financeAdmin } = await signupUser(app, {
      email: emailFor(50),
      name: "FinanceAdmin",
    });
    await makeAdmin(financeAdmin, "finance");
    const { agent: fullAdminAgent, user: fullAdmin } = await signupUser(app, { email: emailFor(51), name: "FullAdmin" });
    await makeAdmin(fullAdmin, "full");
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(52),
      name: "Transporter",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(transporterAgent);

    const financeRes = await financeAdminAgent.put(`/admin/trips/${trip._id}/deactivate`).send({ reason: "test" });
    expect(financeRes.status).toBe(403);

    const fullRes = await fullAdminAgent.put(`/admin/trips/${trip._id}/deactivate`).send({ reason: "no longer needed" });
    expect(fullRes.status).toBe(200);
    expect(fullRes.body.success).toBe(true);
    expect(fullRes.body.trip.status).toBe("cancelled");

    const follow = await fullAdminAgent.get("/admin/trips");
    const persisted = follow.body.items.find((t) => String(t._id) === String(trip._id));
    expect(persisted.status).toBe("cancelled");
  });

  it("force-cancels a booking as a full-scope admin, and blocks a finance-scope admin with 403", async () => {
    const { agent: financeAdminAgent, user: financeAdmin } = await signupUser(app, {
      email: emailFor(60),
      name: "FinanceAdmin",
    });
    await makeAdmin(financeAdmin, "finance");
    const { agent: fullAdminAgent, user: fullAdmin } = await signupUser(app, { email: emailFor(61), name: "FullAdmin" });
    await makeAdmin(fullAdmin, "full");
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(62),
      name: "Transporter",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, {
      email: emailFor(63),
      name: "Shipper",
      roles: ["shipper"],
    });
    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 4, goodsDescription: "Steel rods" });
    const bookingId = bookingRes.body.booking._id;

    const financeRes = await financeAdminAgent.put(`/admin/bookings/${bookingId}/force-cancel`).send({ reason: "test" });
    expect(financeRes.status).toBe(403);

    const fullRes = await fullAdminAgent
      .put(`/admin/bookings/${bookingId}/force-cancel`)
      .send({ reason: "shipper requested via support" });
    expect(fullRes.status).toBe(200);
    expect(fullRes.body.success).toBe(true);
    expect(fullRes.body.booking.status).toBe("cancelled");

    const follow = await fullAdminAgent.get("/admin/bookings");
    const persisted = follow.body.items.find((b) => String(b._id) === String(bookingId));
    expect(persisted.status).toBe("cancelled");
  });

  it("returns platform settings, updates verificationGateEnabled as full scope, and updates commission as finance scope", async () => {
    const { agent: fullAdminAgent, user: fullAdmin } = await signupUser(app, { email: emailFor(70), name: "FullAdmin" });
    await makeAdmin(fullAdmin, "full");
    const { agent: financeAdminAgent, user: financeAdmin } = await signupUser(app, {
      email: emailFor(71),
      name: "FinanceAdmin",
    });
    await makeAdmin(financeAdmin, "finance");

    const getRes = await fullAdminAgent.get("/admin/settings");
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.settings).toHaveProperty("verificationGateEnabled");
    expect(getRes.body.settings).toHaveProperty("commissionPercent");
    const currentGate = getRes.body.settings.verificationGateEnabled;

    // A finance-scope admin is blocked from the full-only settings endpoint.
    const financeBlocked = await financeAdminAgent.put("/admin/settings").send({ verificationGateEnabled: !currentGate });
    expect(financeBlocked.status).toBe(403);

    const putRes = await fullAdminAgent.put("/admin/settings").send({ verificationGateEnabled: !currentGate });
    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.settings.verificationGateEnabled).toBe(!currentGate);

    const commissionRes = await financeAdminAgent.put("/admin/settings/commission").send({ commissionPercent: 15 });
    expect(commissionRes.status).toBe(200);
    expect(commissionRes.body.success).toBe(true);
    expect(commissionRes.body.settings.commissionPercent).toBe(15);

    const confirmRes = await fullAdminAgent.get("/admin/settings");
    expect(confirmRes.body.settings.commissionPercent).toBe(15);
    expect(confirmRes.body.settings.verificationGateEnabled).toBe(!currentGate);
  });

  it("serves all four CSV report endpoints as text/csv with a non-empty body for an admin, and 403 for a non-admin", async () => {
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(80), name: "Admin" });
    await makeAdmin(adminUser, "full");
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(81),
      name: "Transporter",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, {
      email: emailFor(82),
      name: "Shipper",
      roles: ["shipper"],
    });
    const { agent: plainAgent } = await signupUser(app, { email: emailFor(83), name: "Plain", roles: ["shipper"] });

    // Seed a booking so bookings.csv / revenue-by-route.csv have real rows,
    // not just a header line.
    const trip = await postTestTrip(transporterAgent);
    await shipperAgent.post("/bookings").send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });

    const reportPaths = [
      "/admin/reports/bookings.csv",
      "/admin/reports/revenue-by-route.csv",
      "/admin/reports/user-growth.csv",
      "/admin/reports/verification-turnaround.csv",
    ];

    for (const path of reportPaths) {
      const res = await adminAgent.get(path);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(typeof res.text).toBe("string");
      expect(res.text.length).toBeGreaterThan(0);

      const forbidden = await plainAgent.get(path);
      expect(forbidden.status).toBe(403);
    }
  });
});
