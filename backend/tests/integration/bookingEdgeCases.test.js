const request = require("supertest");
const app = require("../../app");
const Booking = require("../../models/bookingModel");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");

// Exactly 10 digits, starting 6-9, per authValidation's mobileSchema.
const mobileFor = (seed) => `9${String(seed).padStart(9, "0")}`;

const newActors = async (seed) => {
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
  return { transporterAgent, transporter, shipperAgent, shipper };
};

beforeEach(async () => {
  await disableVerificationGate();
});

describe("booking edge cases", () => {
  it("lets the transporter reject a pending booking, with a reason", async () => {
    const { transporterAgent, shipperAgent } = await newActors(1);
    const trip = await postTestTrip(transporterAgent);

    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;

    const rejectRes = await transporterAgent.put(`/bookings/${bookingId}/reject`).send({ reason: "No room" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.booking.status).toBe("rejected");
    expect(rejectRes.body.booking.rejectReason).toBe("No room");
  });

  it("does not let the shipper (or a stranger) reject a booking", async () => {
    const { transporterAgent, shipperAgent } = await newActors(2);
    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;

    const res = await shipperAgent.put(`/bookings/${bookingId}/reject`).send({ reason: "x" });
    expect(res.status).toBe(403);
  });

  it("blocks cancelling a confirmed booking inside the 6h pre-departure window", async () => {
    const { transporterAgent, shipperAgent, shipper } = await newActors(3);
    // 3 hours out — inside the 6h cancellation cutoff, still satisfies "must be in the future" at creation.
    const departureAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const trip = await postTestTrip(transporterAgent, { departureAt });

    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);

    const cancelRes = await shipperAgent.put(`/bookings/${bookingId}/cancel`).send({ reason: "changed mind" });
    expect(cancelRes.status).toBe(400);

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe("confirmed");
  });

  it("cancelling a paid, confirmed booking outside the window refunds the shipper and releases capacity", async () => {
    const { transporterAgent, shipperAgent, shipper } = await newActors(4);
    const trip = await postTestTrip(transporterAgent); // 2 days out by default — outside the 6h window

    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;
    const price = bookingRes.body.booking.priceEstimate;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);

    // Fund and pay via a direct admin-scope grant on this same test user, to
    // avoid pulling in a whole second admin actor just to seed the wallet.
    shipper.isAdmin = true;
    shipper.adminScope = "finance";
    await shipper.save();
    await shipperAgent.post(`/admin/wallets/${shipper._id}/adjust`).send({
      amount: price,
      direction: "credit",
      reason: "test funding",
    });
    shipper.isAdmin = false;
    shipper.adminScope = undefined;
    await shipper.save();

    await shipperAgent.post(`/bookings/${bookingId}/pay/wallet`);

    const cancelRes = await shipperAgent.put(`/bookings/${bookingId}/cancel`).send({ reason: "changed mind" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking.status).toBe("cancelled");

    const walletRes = await shipperAgent.get("/wallet/me");
    expect(walletRes.body.wallet.balance).toBe(price); // refunded back

    const tripRes = await request(app).get(`/trips/${trip._id}`);
    expect(tripRes.body.trip.availableCapacity).toBe(20); // released back
  });

  it("rejects a booking request that would exceed capacity already held by another pending request", async () => {
    const { transporterAgent, shipperAgent } = await newActors(5);
    const trip = await postTestTrip(transporterAgent, { totalCapacity: 10, availableCapacity: 10 });

    const { agent: shipper2Agent } = await signupUser(app, { mobile: mobileFor(53), name: "S2", roles: ["shipper"] });

    const first = await shipperAgent.post("/bookings").send({ tripId: trip._id, capacityRequested: 7, goodsDescription: "x" });
    expect(first.status).toBe(201);

    // Only 3 tons visibly left (10 - 7 held by the pending first request).
    const second = await shipper2Agent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "y" });
    expect(second.status).toBe(400);
    expect(second.body.msg).toMatch(/3 tons available/);
  });

  it("lazily expires a pending booking once its respondBy deadline has passed", async () => {
    const { transporterAgent, shipperAgent } = await newActors(6);
    const trip = await postTestTrip(transporterAgent);

    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;

    await Booking.updateOne({ _id: bookingId }, { $set: { respondBy: new Date(Date.now() - 1000) } });

    const getRes = await shipperAgent.get(`/bookings/${bookingId}`);
    expect(getRes.body.booking.status).toBe("expired");
  });
});
