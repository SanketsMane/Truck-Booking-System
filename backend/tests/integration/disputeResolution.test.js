const app = require("../../app");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const mobileFor = (seed) => `9${String(seed).padStart(9, "0")}`;

// Drives a booking all the way to "completed" via the real API — a
// dispute can only be raised on a completed booking — then returns the
// actors and booking id for the test to raise/resolve a dispute against.
const completedBooking = async (seed) => {
  await disableVerificationGate();
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

  const bookingRes = await shipperAgent
    .post("/bookings")
    .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
  const bookingId = bookingRes.body.booking._id;
  const price = bookingRes.body.booking.priceEstimate;
  await transporterAgent.put(`/bookings/${bookingId}/accept`);

  shipper.isAdmin = true;
  shipper.adminScope = "finance";
  await shipper.save();
  await shipperAgent.post(`/admin/wallets/${shipper._id}/adjust`).send({ amount: price, direction: "credit", reason: "funding" });
  shipper.isAdmin = false;
  shipper.adminScope = undefined;
  await shipper.save();

  await shipperAgent.post(`/bookings/${bookingId}/pay/wallet`);
  await shipperAgent.put(`/bookings/${bookingId}/confirm-pickup`);
  await transporterAgent.put(`/bookings/${bookingId}/confirm-drop`);

  return { transporterAgent, transporter, shipperAgent, shipper, bookingId, price };
};

describe("dispute resolution", () => {
  it("blocks raising a dispute on a booking that isn't completed", async () => {
    await disableVerificationGate();
    const { agent: transporterAgent } = await signupUser(app, { mobile: mobileFor(11), name: "T", roles: ["transporter"] });
    const { agent: shipperAgent } = await signupUser(app, { mobile: mobileFor(12), name: "S", roles: ["shipper"] });
    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent.post("/bookings").send({ tripId: trip._id, capacityRequested: 2, goodsDescription: "x" });

    const res = await shipperAgent
      .post("/disputes")
      .send({ bookingId: bookingRes.body.booking._id, category: "no_show", description: "Never showed up at all" });
    expect(res.status).toBe(400);
  });

  it("lets either party raise a dispute on a completed booking, deriving the counterparty server-side", async () => {
    const { shipperAgent, shipper, transporter, bookingId } = await completedBooking(2);

    const res = await shipperAgent
      .post("/disputes")
      .send({ bookingId, category: "damaged_goods", description: "Several boxes arrived crushed and unusable." });
    expect(res.status).toBe(201);
    expect(String(res.body.dispute.raisedBy)).toBe(String(shipper._id));
    expect(String(res.body.dispute.againstUser)).toBe(String(transporter._id));
    expect(res.body.dispute.status).toBe("open");
  });

  it("rejects a second dispute from the same raiser on the same booking", async () => {
    const { shipperAgent, bookingId } = await completedBooking(3);
    await shipperAgent.post("/disputes").send({ bookingId, category: "other", description: "First report about this booking." });

    const second = await shipperAgent
      .post("/disputes")
      .send({ bookingId, category: "other", description: "Second report, same booking, same person." });
    expect(second.status).toBe(409);
  });

  it("a non-support-scoped admin cannot resolve a dispute", async () => {
    const { shipperAgent, bookingId } = await completedBooking(4);
    const disputeRes = await shipperAgent
      .post("/disputes")
      .send({ bookingId, category: "other", description: "Something worth reporting here." });
    const disputeId = disputeRes.body.dispute._id;

    const { agent: financeAgent, user: financeAdmin } = await signupUser(app, { mobile: mobileFor(49), name: "Fin" });
    await makeAdmin(financeAdmin, "finance");

    const res = await financeAgent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "resolved", resolutionAction: "none", resolutionNote: "n/a" });
    expect(res.status).toBe(403);
  });

  it("resolving with refund_shipper credits the shipper's wallet and logs the resolution", async () => {
    const { shipperAgent, shipper, bookingId } = await completedBooking(5);
    const disputeRes = await shipperAgent
      .post("/disputes")
      .send({ bookingId, category: "damaged_goods", description: "Goods arrived damaged, requesting compensation." });
    const disputeId = disputeRes.body.dispute._id;

    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { mobile: mobileFor(59), name: "Sup" });
    await makeAdmin(supportAdmin, "support");

    const balanceBefore = (await shipperAgent.get("/wallet/me")).body.wallet.balance;

    const resolveRes = await supportAgent.put(`/admin/disputes/${disputeId}/resolve`).send({
      status: "resolved",
      resolutionAction: "refund_shipper",
      resolutionAmount: 500,
      resolutionNote: "Confirmed damage from photos, partial refund issued.",
    });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.dispute.status).toBe("resolved");

    const balanceAfter = (await shipperAgent.get("/wallet/me")).body.wallet.balance;
    expect(balanceAfter).toBe(balanceBefore + 500);
  });

  it("rejects resolving an already-resolved dispute", async () => {
    const { shipperAgent, bookingId } = await completedBooking(6);
    const disputeRes = await shipperAgent
      .post("/disputes")
      .send({ bookingId, category: "other", description: "Something worth reporting here too." });
    const disputeId = disputeRes.body.dispute._id;

    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { mobile: mobileFor(69), name: "Sup" });
    await makeAdmin(supportAdmin, "support");

    await supportAgent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "rejected", resolutionAction: "none", resolutionNote: "Not substantiated." });

    const second = await supportAgent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "resolved", resolutionAction: "none", resolutionNote: "trying again" });
    expect(second.status).toBe(400);
  });

  it("requires an amount for a money-moving resolution action, and forbids one otherwise", async () => {
    const { shipperAgent, bookingId } = await completedBooking(7);
    const disputeRes = await shipperAgent
      .post("/disputes")
      .send({ bookingId, category: "other", description: "Yet another reportable issue here." });
    const disputeId = disputeRes.body.dispute._id;

    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { mobile: mobileFor(79), name: "Sup" });
    await makeAdmin(supportAdmin, "support");

    const missingAmount = await supportAgent.put(`/admin/disputes/${disputeId}/resolve`).send({
      status: "resolved",
      resolutionAction: "refund_shipper",
      resolutionNote: "no amount given",
    });
    expect(missingAmount.status).toBe(400);

    const unexpectedAmount = await supportAgent.put(`/admin/disputes/${disputeId}/resolve`).send({
      status: "resolved",
      resolutionAction: "warning_issued",
      resolutionAmount: 100,
      resolutionNote: "shouldn't allow an amount here",
    });
    expect(unexpectedAmount.status).toBe(400);
  });
});
