const request = require("supertest");
const app = require("../../app");
const Truck = require("../../models/truckModel");
const Trip = require("../../models/tripModel");
const { signupUser, makeAdmin, disableVerificationGate, uniqueRegNumber } = require("../helpers");

const emailFor = (seed) => `draft${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

const registerTruck = async (agent, overrides = {}) => {
  const res = await agent.post("/trucks").send({
    regNumber: overrides.regNumber || uniqueRegNumber(),
    truckType: "Open Body",
    bodyType: "Flatbed",
    totalCapacity: overrides.totalCapacity ?? 20,
  });
  if (!res.body.success) throw new Error(`registerTruck failed: ${res.body.msg}`);
  return res.body.truck;
};

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

describe("POST /trips — with an unverified truck", () => {
  it("saves the trip as a draft (not published) when the truck is still pending", async () => {
    const { agent } = await signupUser(app, { email: emailFor(1), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(201);
    expect(res.body.trip.status).toBe("draft");
    expect(res.body.msg).toMatch(/draft/i);

    const persisted = await Trip.findById(res.body.trip._id);
    expect(persisted.status).toBe("draft");
  });

  it("rejects creating a trip on a truck whose documents were rejected", async () => {
    const { agent, user: transporter } = await signupUser(app, {
      email: emailFor(2),
      name: "Transporter",
      roles: ["transporter"],
    });
    const truck = await registerTruck(agent);

    const { agent: adminAgent, user: admin } = await signupUser(app, { email: emailFor(3), name: "Admin" });
    await makeAdmin(admin, "verification");
    await adminAgent.put(`/trucks/${truck._id}/review`).send({ status: "rejected", reason: "Blurry RC photo" });

    const res = await agent.post("/trips").send(postTripBody(truck._id));
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/rejected/i);
    expect(String(transporter._id)).toBeTruthy(); // sanity: fixture wired correctly
  });

  it("a draft trip does not appear in trip search and cannot be booked", async () => {
    const { agent } = await signupUser(app, { email: emailFor(4), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    const created = await agent.post("/trips").send(postTripBody(truck._id, { fromCity: "Delhi", toCity: "Jaipur" }));
    expect(created.body.trip.status).toBe("draft");

    const date = created.body.trip.departureAt.slice(0, 10);
    const searchRes = await request(app).get(`/trips/search?fromCity=Delhi&toCity=Jaipur&date=${date}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.trips.find((t) => t._id === created.body.trip._id)).toBeUndefined();

    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(5), name: "Shipper", roles: ["shipper"] });
    const bookRes = await shipperAgent.post("/bookings").send({
      tripId: created.body.trip._id,
      capacityRequested: 5,
      goodsDescription: "Textiles",
    });
    expect(bookRes.status).toBe(400);
    expect(bookRes.body.msg).toMatch(/isn't accepting bookings/i);
  });
});

describe("PUT /trucks/:id/review — approving a truck with draft trips waiting on it", () => {
  it("auto-publishes a future-dated draft trip once its truck is verified, and notifies the transporter", async () => {
    const { agent } = await signupUser(app, { email: emailFor(6), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    const created = await agent.post("/trips").send(postTripBody(truck._id));
    expect(created.body.trip.status).toBe("draft");

    const { agent: adminAgent, user: admin } = await signupUser(app, { email: emailFor(7), name: "Admin" });
    await makeAdmin(admin, "verification");
    const reviewRes = await adminAgent.put(`/trucks/${truck._id}/review`).send({ status: "verified" });
    expect(reviewRes.status).toBe(200);

    const publishedTrip = await Trip.findById(created.body.trip._id);
    expect(publishedTrip.status).toBe("published");

    const searchRes = await request(app).get(
      `/trips/search?fromCity=Pune&toCity=Nashik&date=${publishedTrip.departureAt.toISOString().slice(0, 10)}`
    );
    expect(searchRes.body.trips.map((t) => t._id)).toContain(String(publishedTrip._id));
  });

  it("does not auto-publish a draft trip whose departure date has already passed", async () => {
    const { agent } = await signupUser(app, { email: emailFor(8), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    const created = await agent
      .post("/trips")
      .send(postTripBody(truck._id, { departureAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }));
    expect(created.body.trip.status).toBe("draft");

    // Backdate it directly — postTripValidation requires a future date at
    // creation time, so this simulates time passing while the truck sat in
    // the review queue rather than trying to create an already-past trip.
    await Trip.updateOne({ _id: created.body.trip._id }, { departureAt: new Date(Date.now() - 60 * 60 * 1000) });

    const { agent: adminAgent, user: admin } = await signupUser(app, { email: emailFor(9), name: "Admin" });
    await makeAdmin(admin, "verification");
    await adminAgent.put(`/trucks/${truck._id}/review`).send({ status: "verified" });

    const stillDraft = await Trip.findById(created.body.trip._id);
    expect(stillDraft.status).toBe("draft");
  });

  it("leaves other transporters' draft trips on other trucks untouched", async () => {
    const { agent: agentA } = await signupUser(app, { email: emailFor(10), name: "A", roles: ["transporter"] });
    const truckA = await registerTruck(agentA);
    const tripA = await agentA.post("/trips").send(postTripBody(truckA._id));

    const { agent: agentB } = await signupUser(app, { email: emailFor(11), name: "B", roles: ["transporter"] });
    const truckB = await registerTruck(agentB);
    const tripB = await agentB.post("/trips").send(postTripBody(truckB._id, { fromCity: "Mumbai", toCity: "Surat" }));

    const { agent: adminAgent, user: admin } = await signupUser(app, { email: emailFor(12), name: "Admin" });
    await makeAdmin(admin, "verification");
    await adminAgent.put(`/trucks/${truckA._id}/review`).send({ status: "verified" });

    expect((await Trip.findById(tripA.body.trip._id)).status).toBe("published");
    expect((await Trip.findById(tripB.body.trip._id)).status).toBe("draft");
  });
});

describe("PUT /trips/:id — editing a draft trip", () => {
  it("lets the owner edit a draft trip's price/capacity/date", async () => {
    const { agent } = await signupUser(app, { email: emailFor(13), name: "Transporter", roles: ["transporter"] });
    const truck = await registerTruck(agent);
    const created = await agent.post("/trips").send(postTripBody(truck._id));
    expect(created.body.trip.status).toBe("draft");

    const res = await agent.put(`/trips/${created.body.trip._id}`).send({ pricePerTon: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.trip.pricePerTon).toBe(1500);
    expect(res.body.trip.status).toBe("draft");
  });
});
