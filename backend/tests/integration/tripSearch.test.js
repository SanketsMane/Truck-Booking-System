const request = require("supertest");
const app = require("../../app");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `search${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

describe("GET /trips/search", () => {
  it("requires either fromCity+toCity or nearLat+nearLng", async () => {
    const res = await request(app).get("/trips/search").query({ date: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  it("requires date", async () => {
    const res = await request(app).get("/trips/search").query({ fromCity: "Pune", toCity: "Nashik" });
    expect(res.status).toBe(400);
  });

  it("matches fromCity/toCity case-insensitively via the normalized fields", async () => {
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(1),
      name: "T1",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(transporterAgent, { fromCity: "Pune", toCity: "Nashik" });

    const res = await request(app).get("/trips/search").query({
      fromCity: "  PUNE ",
      toCity: "nashik",
      date: new Date(trip.departureAt).toISOString(),
    });

    expect(res.status).toBe(200);
    expect(res.body.trips.map((t) => t._id)).toContain(trip._id);
  });

  it("does not match a different city pair", async () => {
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(2),
      name: "T2",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(transporterAgent, { fromCity: "Pune", toCity: "Nashik" });

    const res = await request(app).get("/trips/search").query({
      fromCity: "Mumbai",
      toCity: "Nashik",
      date: new Date(trip.departureAt).toISOString(),
    });

    expect(res.status).toBe(200);
    expect(res.body.trips.map((t) => t._id)).not.toContain(trip._id);
  });

  it("finds a trip by geo-radius around its pickup point, and excludes one outside the radius", async () => {
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(3),
      name: "T3",
      roles: ["transporter"],
    });

    // Pune coordinates — pickup point set with lat/lng so setLocationGeo
    // populates pickupPoint.location for the 2dsphere index.
    const nearTrip = await postTestTrip(transporterAgent, {
      fromCity: "Pune",
      toCity: "Nashik",
      pickupPoint: { address: "Pune warehouse", lat: 18.5204, lng: 73.8567 },
    });

    // Delhi — roughly 1150km from Pune, well outside a 50km radius.
    const farTrip = await postTestTrip(transporterAgent, {
      fromCity: "Delhi",
      toCity: "Jaipur",
      pickupPoint: { address: "Delhi warehouse", lat: 28.7041, lng: 77.1025 },
    });

    const res = await request(app).get("/trips/search").query({
      nearLat: 18.5204,
      nearLng: 73.8567,
      radiusKm: 50,
      date: new Date(nearTrip.departureAt).toISOString(),
    });

    expect(res.status).toBe(200);
    const ids = res.body.trips.map((t) => t._id);
    expect(ids).toContain(nearTrip._id);
    expect(ids).not.toContain(farTrip._id);
  });

  it("rejects a non-numeric nearLat/nearLng", async () => {
    const res = await request(app).get("/trips/search").query({
      nearLat: "not-a-number",
      nearLng: "73.8567",
      date: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
  });
});
