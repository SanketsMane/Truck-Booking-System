// Covers what replaced the old "unverified truck -> draft trip, auto-
// published on review" flow: postTrip publishes immediately, and blocks
// only on the two things that genuinely matter — the truck passed its own
// KYC review, and it hasn't been retired. Driver person-level KYC follows
// PlatformSetting.verificationGateEnabled like every other gate in the app,
// so it's exercised here in both positions. There's no draft/auto-publish
// path for new trips either way.
const PlatformSetting = require("../../models/platformSettingModel");
const request = require("supertest");
const app = require("../../app");
const Verification = require("../../models/verificationModel");
const Truck = require("../../models/truckModel");
const { signupUser, makeAdmin, uniqueRegNumber } = require("../helpers");

const emailFor = (seed) => `draft${seed}@example.test`;

const registerTruck = async (agent, overrides = {}) => {
  const res = await agent.post("/trucks").send({
    regNumber: overrides.regNumber || uniqueRegNumber(),
    truckType: "Open Body",
    bodyType: "Flatbed",
    totalCapacity: overrides.totalCapacity ?? 20,
    authorizedToList: true,
  });
  if (!res.body.success) throw new Error(`registerTruck failed: ${res.body.msg}`);
  return res.body.truck;
};

const verifyTruck = async (truckId) => {
  const { agent: adminAgent, user: admin } = await signupUser(app, {
    email: emailFor(`admin-${truckId}`),
    name: "Admin",
  });
  await makeAdmin(admin, "verification");
  return adminAgent.put(`/trucks/${truckId}/review`).send({ status: "verified" });
};

const verifyDriverKyc = async (userId) =>
  Verification.findOneAndUpdate(
    { user: userId, type: "transporter" },
    { $set: { status: "verified" } },
    { upsert: true, setDefaultsOnInsert: true }
  );

const postTripBody = (truckId, overrides = {}) => ({
  truckId,
  fromCity: overrides.fromCity || "Pune",
  toCity: overrides.toCity || "Nashik",
  departureAt: overrides.departureAt || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  pickupPoint: overrides.pickupPoint || { address: "Pune warehouse" },
  dropPoint: overrides.dropPoint || { address: "Nashik yard" },
  totalCapacity: overrides.totalCapacity ?? 20,
  availableCapacity: overrides.availableCapacity ?? 20,
  pricePerTon: overrides.pricePerTon || 1000,
});

describe("POST /trips — the truck must be verified and not retired", () => {
  it("blocks posting a trip while the truck is still a pending candidate", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(1), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyDriverKyc(user._id);

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/awaiting verification/i);
  });

  it("blocks posting a trip on a truck whose documents were rejected", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyDriverKyc(user._id);

    const { agent: adminAgent, user: admin } = await signupUser(app, { email: emailFor(3), name: "Admin" });
    await makeAdmin(admin, "verification");
    await adminAgent.put(`/trucks/${truck._id}/review`).send({ status: "rejected", reason: "Blurry RC photo" });

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/awaiting verification/i);
  });

  it("publishes immediately (no draft) once the truck is verified and becomes active, and the trip is searchable/bookable", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(4), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyDriverKyc(user._id);
    const reviewRes = await verifyTruck(truck._id);
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.truck.lifecycle).toBe("active");

    const created = await agent.post("/trips").send(postTripBody(truck._id, { fromCity: "Delhi", toCity: "Jaipur" }));
    expect(created.status).toBe(201);
    expect(created.body.trip.status).toBe("published");

    // searchTrips anchors a plain YYYY-MM-DD `date` at IST midnight (see its
    // own comment) — the search date must be departureAt's IST calendar
    // date, not a naive UTC slice, or the ±1-day window can miss it
    // depending on what wall-clock time the test happens to run at.
    const date = new Date(new Date(created.body.trip.departureAt).getTime() + 5.5 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const searchRes = await request(app).get(`/trips/search?fromCity=Delhi&toCity=Jaipur&date=${date}`);
    expect(searchRes.body.trips.map((t) => t._id)).toContain(created.body.trip._id);

    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(5), name: "Shipper", roles: ["shipper"] });
    const bookRes = await shipperAgent.post("/bookings").send({
      tripId: created.body.trip._id,
      capacityRequested: 5,
      goodsDescription: "Textiles",
    });
    expect(bookRes.status).toBe(201);
  });

  it("keeps BOTH trucks postable once a second one is verified", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(6), name: "Transporter", roles: ["transporter"] });
    const truckA = await registerTruck(agent);
    await verifyDriverKyc(user._id);
    await verifyTruck(truckA._id);

    const truckB = await registerTruck(agent, { regNumber: uniqueRegNumber() });
    const reviewB = await verifyTruck(truckB._id);
    expect(reviewB.body.truck.lifecycle).toBe("active");

    // Verifying truckB used to retire truckA out from under the owner, so
    // this exact call was a 400. A transporter running two lorries can post
    // on either.
    expect((await agent.post("/trips").send(postTripBody(truckA._id))).status).toBe(201);
    expect((await agent.post("/trips").send(postTripBody(truckB._id))).status).toBe(201);
  });

  it("blocks posting against a truck that has actually been retired", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(60), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyDriverKyc(user._id);
    await verifyTruck(truck._id);
    await Truck.updateOne({ _id: truck._id }, { $set: { lifecycle: "inactive" } });

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/retired/i);
  });
});

describe("POST /trips — driver verification follows the platform gate", () => {
  const enableGate = async () => {
    const settings = await PlatformSetting.getSettings();
    settings.verificationGateEnabled = true;
    await settings.save();
  };

  it("lets a driver with no verification record publish while the gate is off", async () => {
    const { agent } = await signupUser(app, { email: emailFor(7), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyTruck(truck._id);

    // This used to be a flat 403 — the one gate in the app that ignored the
    // platform switch entirely, so an admin who had deliberately turned
    // verification off still couldn't let a driver post.
    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(201);
  });

  it("blocks a driver with no verification record once the gate is on", async () => {
    const { agent } = await signupUser(app, { email: emailFor(70), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyTruck(truck._id);
    await enableGate();

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(403);
    expect(res.body.msg).toMatch(/driver verification/i);
  });

  it("blocks a pending driver verification once the gate is on", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(8), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyTruck(truck._id);
    await Verification.create({ user: user._id, type: "transporter", status: "pending" });
    await enableGate();

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(403);
  });
});

describe("PUT /trips/:id — editing an open trip", () => {
  it("lets the owner edit a published trip's price/capacity/date", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(9), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    await verifyDriverKyc(user._id);
    await verifyTruck(truck._id);
    const created = await agent.post("/trips").send(postTripBody(truck._id));
    expect(created.body.trip.status).toBe("published");

    const res = await agent.put(`/trips/${created.body.trip._id}`).send({ pricePerTon: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.trip.pricePerTon).toBe(1500);
  });
});
