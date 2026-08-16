const request = require("supertest");
const app = require("../../app");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `xtra${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

describe("GET /trips/popular-routes", () => {
  it("works with no auth and returns 200", async () => {
    const res = await request(app).get("/trips/popular-routes");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.routes)).toBe(true);
  });
});

describe("GET /trips/me", () => {
  it("shows a transporter's own trips but not another transporter's, and blocks non-transporters", async () => {
    const { agent: transporterAAgent } = await signupUser(app, {
      email: emailFor(1),
      name: "Transporter A",
      roles: ["transporter"],
    });
    const { agent: transporterBAgent } = await signupUser(app, {
      email: emailFor(2),
      name: "Transporter B",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, {
      email: emailFor(3),
      name: "Shipper",
      roles: ["shipper"],
    });

    const tripA = await postTestTrip(transporterAAgent, { fromCity: "Pune", toCity: "Nashik" });

    const resA = await transporterAAgent.get("/trips/me");
    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(Array.isArray(resA.body.trips)).toBe(true);
    expect(resA.body.trips.map((t) => t._id)).toContain(tripA._id);

    const resB = await transporterBAgent.get("/trips/me");
    expect(resB.status).toBe(200);
    expect(resB.body.trips.map((t) => t._id)).not.toContain(tripA._id);
    expect(resB.body.trips).toHaveLength(0);

    const resShipper = await shipperAgent.get("/trips/me");
    expect(resShipper.status).toBe(403);
  });
});

describe("POST /trips/search-alerts", () => {
  it("saves a search alert with a valid body", async () => {
    const { agent } = await signupUser(app, { email: emailFor(4), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/trips/search-alerts").send({
      fromCity: "Pune",
      toCity: "Nashik",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert).toMatchObject({ fromCity: "Pune", toCity: "Nashik" });
  });

  it("rejects a body missing a required field", async () => {
    const { agent } = await signupUser(app, { email: emailFor(5), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/trips/search-alerts").send({ fromCity: "Pune" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /trips/:id (edit)", () => {
  it("lets the owning transporter change a field, and reflects it in the response", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(6),
      name: "Owner",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent, { pricePerTon: 1000 });

    const res = await ownerAgent.put(`/trips/${trip._id}`).send({ pricePerTon: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.pricePerTon).toBe(1500);
  });

  it("blocks a different transporter from editing someone else's trip", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(7),
      name: "Owner",
      roles: ["transporter"],
    });
    const { agent: otherAgent } = await signupUser(app, {
      email: emailFor(8),
      name: "Other",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent, { pricePerTon: 1000 });

    const res = await otherAgent.put(`/trips/${trip._id}`).send({ pricePerTon: 2000 });
    // editTrip scopes the lookup to {_id, transporter: req.auth.id}, so a
    // non-owner gets the same "not found" as a nonexistent trip.
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("DELETE /trips/:id (cancel)", () => {
  it("lets the owner cancel their trip, setting status to cancelled", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(9),
      name: "Owner",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent);

    const res = await ownerAgent.delete(`/trips/${trip._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.status).toBe("cancelled");

    const getRes = await request(app).get(`/trips/${trip._id}`);
    expect(getRes.body.trip.status).toBe("cancelled");
  });

  it("blocks a non-owner from cancelling someone else's trip", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(10),
      name: "Owner",
      roles: ["transporter"],
    });
    const { agent: otherAgent } = await signupUser(app, {
      email: emailFor(11),
      name: "Other",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent);

    const res = await otherAgent.delete(`/trips/${trip._id}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    const getRes = await request(app).get(`/trips/${trip._id}`);
    expect(getRes.body.trip.status).not.toBe("cancelled");
  });
});
