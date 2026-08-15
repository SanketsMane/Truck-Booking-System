const app = require("../../app");
const Booking = require("../../models/bookingModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const mobileFor = (seed) => `9${String(seed).padStart(9, "0")}`;

// canViewTripLocation (utils/tripLocationAuth.js) permutations, exercised
// through the real GET /trips/:id/location endpoint rather than calling
// the helper directly — this also proves the route actually wires it up.
describe("trip GPS location authorization", () => {
  beforeEach(async () => {
    await disableVerificationGate();
  });

  const setup = async (seed) => {
    const { agent: transporterAgent, user: transporter } = await signupUser(app, {
      mobile: mobileFor(seed * 10 + 1),
      name: "T",
      roles: ["transporter"],
    });
    const { agent: shipperAgent, user: shipper } = await signupUser(app, {
      mobile: mobileFor(seed * 10 + 2),
      name: "S",
      roles: ["shipper"],
    });
    const trip = await postTestTrip(transporterAgent);
    return { transporterAgent, transporter, shipperAgent, shipper, trip };
  };

  it("lets the trip's own transporter view its location", async () => {
    const { transporterAgent, trip } = await setup(1);
    const res = await transporterAgent.get(`/trips/${trip._id}/location`);
    expect(res.status).toBe(200);
  });

  it("lets an admin view any trip's location", async () => {
    const { trip } = await setup(2);
    const { agent: adminAgent, user: adminUser } = await signupUser(app, { mobile: mobileFor(29), name: "Admin" });
    await makeAdmin(adminUser, "full");

    const res = await adminAgent.get(`/trips/${trip._id}/location`);
    expect(res.status).toBe(200);
  });

  it("blocks a shipper with no booking on the trip", async () => {
    const { shipperAgent, trip } = await setup(3);
    const res = await shipperAgent.get(`/trips/${trip._id}/location`);
    expect(res.status).toBe(403);
  });

  it("blocks a shipper whose booking is still only pending", async () => {
    const { shipperAgent, trip } = await setup(4);
    await shipperAgent.post("/bookings").send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });

    const res = await shipperAgent.get(`/trips/${trip._id}/location`);
    expect(res.status).toBe(403);
  });

  it("lets a shipper with a confirmed booking view the trip's location (watch the truck approach pickup)", async () => {
    const { transporterAgent, shipperAgent, trip } = await setup(5);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });
    await transporterAgent.put(`/bookings/${bookingRes.body.booking._id}/accept`);

    const res = await shipperAgent.get(`/trips/${trip._id}/location`);
    expect(res.status).toBe(200);
  });

  it("blocks an unrelated shipper even once someone else's booking on the same trip is confirmed", async () => {
    const { transporterAgent, shipperAgent, trip } = await setup(6);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });
    await transporterAgent.put(`/bookings/${bookingRes.body.booking._id}/accept`);

    const { agent: strangerAgent } = await signupUser(app, { mobile: mobileFor(69), name: "Stranger", roles: ["shipper"] });
    const res = await strangerAgent.get(`/trips/${trip._id}/location`);
    expect(res.status).toBe(403);
  });

  it("a transporter can only post location updates for their own trip while a booking is ongoing", async () => {
    const { transporterAgent, shipperAgent, trip } = await setup(7);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });
    const bookingId = bookingRes.body.booking._id;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);

    // Confirmed, not yet ongoing — no active leg to track.
    const tooEarly = await transporterAgent.put(`/trips/${trip._id}/location`).send({ lat: 18.5, lng: 73.8 });
    expect(tooEarly.status).toBe(400);

    await Booking.updateOne({ _id: bookingId }, { $set: { status: "ongoing", paymentStatus: "paid" } });

    const ok = await transporterAgent.put(`/trips/${trip._id}/location`).send({ lat: 18.5, lng: 73.8 });
    expect(ok.status).toBe(200);

    const { agent: otherTransporterAgent } = await signupUser(app, {
      mobile: mobileFor(79),
      name: "Other",
      roles: ["transporter"],
    });
    const forbidden = await otherTransporterAgent.put(`/trips/${trip._id}/location`).send({ lat: 18.5, lng: 73.8 });
    expect(forbidden.status).toBe(404); // not this transporter's trip — same "not found" the codebase uses for ownership mismatches
  });
});
