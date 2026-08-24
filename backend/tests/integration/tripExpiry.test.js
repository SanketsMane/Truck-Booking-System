const request = require("supertest");
const app = require("../../app");
const Trip = require("../../models/tripModel");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");
const { expireStaleTrips } = require("../../jobs/tripExpiry");

const emailFor = (seed) => `expiry${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

describe("expireStaleTrips", () => {
  it("expires a published trip with no bookings once its departure has passed", async () => {
    const { agent } = await signupUser(app, { email: emailFor(1), name: "T", roles: ["transporter"] });
    const trip = await postTestTrip(agent, { fromCity: "Pune", toCity: "Nashik" });
    expect(trip.status).toBe("published");

    await Trip.updateOne({ _id: trip._id }, { departureAt: new Date(Date.now() - 60 * 60 * 1000) });

    const count = await expireStaleTrips();
    expect(count).toBe(1);

    const updated = await Trip.findById(trip._id);
    expect(updated.status).toBe("expired");
  });

  it("leaves a published trip alone while its departure is still in the future", async () => {
    const { agent } = await signupUser(app, { email: emailFor(2), name: "T", roles: ["transporter"] });
    const trip = await postTestTrip(agent);

    const count = await expireStaleTrips();
    expect(count).toBe(0);

    const unchanged = await Trip.findById(trip._id);
    expect(unchanged.status).toBe("published");
  });

  it("does not expire a past-due trip that has an active (confirmed) booking", async () => {
    const { agent: transporterAgent } = await signupUser(app, { email: emailFor(3), name: "T", roles: ["transporter"] });
    const trip = await postTestTrip(transporterAgent, { totalCapacity: 20, availableCapacity: 20 });

    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(4), name: "S", roles: ["shipper"] });
    const bookingRes = await shipperAgent.post("/bookings").send({
      tripId: trip._id,
      capacityRequested: 5,
      goodsDescription: "Cotton bales",
    });
    expect(bookingRes.status).toBe(201);
    const acceptRes = await transporterAgent.put(`/bookings/${bookingRes.body.booking._id}/accept`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.booking.status).toBe("confirmed");

    await Trip.updateOne({ _id: trip._id }, { departureAt: new Date(Date.now() - 60 * 60 * 1000) });

    const count = await expireStaleTrips();
    expect(count).toBe(0);

    const stillPublished = await Trip.findById(trip._id);
    expect(stillPublished.status).toBe("published");
  });

  it("does not touch draft, completed, or already-cancelled trips", async () => {
    const { agent } = await signupUser(app, { email: emailFor(5), name: "T", roles: ["transporter"] });
    // postTrip can no longer create a "draft" trip (a candidate/unverified
    // truck is hard-blocked outright, not saved as a draft) — this status
    // only exists on legacy data now, so it's set directly rather than
    // through the API, purely to confirm expireStaleTrips's status filter
    // still skips it regardless of how it got there.
    const trip = await postTestTrip(agent);
    await Trip.updateOne(
      { _id: trip._id },
      { status: "draft", departureAt: new Date(Date.now() - 60 * 60 * 1000) }
    );

    const count = await expireStaleTrips();
    expect(count).toBe(0);
    expect((await Trip.findById(trip._id)).status).toBe("draft");
  });

  it("an expired trip no longer appears in trip search", async () => {
    const { agent } = await signupUser(app, { email: emailFor(6), name: "T", roles: ["transporter"] });
    const trip = await postTestTrip(agent, { fromCity: "Delhi", toCity: "Agra" });
    const date = trip.departureAt.slice(0, 10);

    await Trip.updateOne({ _id: trip._id }, { departureAt: new Date(Date.now() - 60 * 60 * 1000) });
    await expireStaleTrips();

    const searchRes = await request(app).get(`/trips/search?fromCity=Delhi&toCity=Agra&date=${date}&rangeDays=30`);
    expect(searchRes.body.trips.find((t) => t._id === String(trip._id))).toBeUndefined();
  });

  it("blocks manually cancelling an already-expired trip", async () => {
    const { agent } = await signupUser(app, { email: emailFor(7), name: "T", roles: ["transporter"] });
    const trip = await postTestTrip(agent);
    await Trip.updateOne({ _id: trip._id }, { departureAt: new Date(Date.now() - 60 * 60 * 1000) });
    await expireStaleTrips();

    const cancelRes = await agent.delete(`/trips/${trip._id}`);
    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.msg).toMatch(/already expired/i);
  });
});
