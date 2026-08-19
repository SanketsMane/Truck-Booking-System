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

  // Real-world scenario this was built for: a truck posted Bangalore->Mumbai
  // should be findable by a shipper searching Pune->Mumbai, since Pune sits
  // close to (and between the endpoints of) that route, not a different one.
  describe("route-corridor matching (fromLat/fromLng/toLat/toLng)", () => {
    const bangalore = { lat: 12.9716, lng: 77.5946 };
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const pune = { lat: 18.5204, lng: 73.8567 };
    const delhi = { lat: 28.7041, lng: 77.1025 };

    it("finds a Bangalore->Mumbai trip when searching Pune->Mumbai with coordinates", async () => {
      const { agent } = await signupUser(app, { email: emailFor(10), name: "T10", roles: ["transporter"] });
      const trip = await postTestTrip(agent, {
        fromCity: "Bangalore",
        toCity: "Mumbai",
        pickupPoint: { address: "Bangalore yard", lat: bangalore.lat, lng: bangalore.lng },
        dropPoint: { address: "Mumbai yard", lat: mumbai.lat, lng: mumbai.lng },
      });

      const res = await request(app).get("/trips/search").query({
        fromCity: "Pune",
        toCity: "Mumbai",
        fromLat: pune.lat,
        fromLng: pune.lng,
        toLat: mumbai.lat,
        toLng: mumbai.lng,
        date: new Date(trip.departureAt).toISOString(),
      });

      expect(res.status).toBe(200);
      const match = res.body.trips.find((t) => t._id === trip._id);
      expect(match).toBeTruthy();
      expect(match.matchType).toBe("route");
    });

    it("does not match when the searched route is nowhere near the trip's actual route", async () => {
      const { agent } = await signupUser(app, { email: emailFor(11), name: "T11", roles: ["transporter"] });
      const trip = await postTestTrip(agent, {
        fromCity: "Bangalore",
        toCity: "Mumbai",
        pickupPoint: { address: "Bangalore yard", lat: bangalore.lat, lng: bangalore.lng },
        dropPoint: { address: "Mumbai yard", lat: mumbai.lat, lng: mumbai.lng },
      });

      const res = await request(app).get("/trips/search").query({
        fromCity: "Delhi",
        toCity: "Mumbai",
        fromLat: delhi.lat,
        fromLng: delhi.lng,
        toLat: mumbai.lat,
        toLng: mumbai.lng,
        date: new Date(trip.departureAt).toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.trips.map((t) => t._id)).not.toContain(trip._id);
    });

    it("still finds an exact city match (marked matchType: exact) even with coordinates present", async () => {
      const { agent } = await signupUser(app, { email: emailFor(12), name: "T12", roles: ["transporter"] });
      const trip = await postTestTrip(agent, {
        fromCity: "Pune",
        toCity: "Mumbai",
        pickupPoint: { address: "Pune yard", lat: pune.lat, lng: pune.lng },
        dropPoint: { address: "Mumbai yard", lat: mumbai.lat, lng: mumbai.lng },
      });

      const res = await request(app).get("/trips/search").query({
        fromCity: "Pune",
        toCity: "Mumbai",
        fromLat: pune.lat,
        fromLng: pune.lng,
        toLat: mumbai.lat,
        toLng: mumbai.lng,
        date: new Date(trip.departureAt).toISOString(),
      });

      expect(res.status).toBe(200);
      const match = res.body.trips.find((t) => t._id === trip._id);
      expect(match).toBeTruthy();
      expect(match.matchType).toBe("exact");
    });

    it("falls back to exact-only matching when coordinates aren't provided (unchanged legacy behavior)", async () => {
      const { agent } = await signupUser(app, { email: emailFor(13), name: "T13", roles: ["transporter"] });
      const trip = await postTestTrip(agent, {
        fromCity: "Bangalore",
        toCity: "Mumbai",
        pickupPoint: { address: "Bangalore yard", lat: bangalore.lat, lng: bangalore.lng },
        dropPoint: { address: "Mumbai yard", lat: mumbai.lat, lng: mumbai.lng },
      });

      // No fromLat/fromLng/toLat/toLng — a plain typed-text city search.
      const res = await request(app).get("/trips/search").query({
        fromCity: "Pune",
        toCity: "Mumbai",
        date: new Date(trip.departureAt).toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.trips.map((t) => t._id)).not.toContain(trip._id);
    });
  });
});
