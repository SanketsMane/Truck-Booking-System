const app = require("../../app");
const Dispute = require("../../models/disputeModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `gap${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

// Closes the last few endpoints left uncovered after the rest of this
// sweep: the KYC integration route, listMyBookings, and the two dispute
// list routes.
describe("final coverage gaps", () => {
  it("PUT /admin/integrations/kyc — full-scope admin saves manual and custom_http config; other scopes are blocked", async () => {
    const { agent: fullAgent, user: fullAdmin } = await signupUser(app, { email: emailFor(1), name: "Admin" });
    await makeAdmin(fullAdmin, "full");

    const manualRes = await fullAgent.put("/admin/integrations/kyc").send({ provider: "manual", config: {} });
    expect(manualRes.status).toBe(200);

    const httpRes = await fullAgent
      .put("/admin/integrations/kyc")
      .send({ provider: "custom_http", config: { url: "https://kyc.example.com/verify" } });
    expect(httpRes.status).toBe(200);

    const check = await fullAgent.get("/admin/integrations");
    expect(check.body.integrations.kyc.provider).toBe("custom_http");
    expect(check.body.integrations.kyc.configured).toBe(true);

    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { email: emailFor(2), name: "Admin2" });
    await makeAdmin(supportAdmin, "support");
    const blocked = await supportAgent.put("/admin/integrations/kyc").send({ provider: "manual", config: {} });
    expect(blocked.status).toBe(403);
  });

  it("GET /bookings/me — defaults to the shipper's own bookings, and role=transporter scopes to their trips", async () => {
    const { agent: transporterAgent, user: transporter } = await signupUser(app, {
      email: emailFor(5),
      name: "T",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(6), name: "S", roles: ["shipper"] });
    const { agent: otherShipperAgent } = await signupUser(app, { email: emailFor(7), name: "S2", roles: ["shipper"] });

    const trip = await postTestTrip(transporterAgent);
    await shipperAgent.post("/bookings").send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });

    const shipperRes = await shipperAgent.get("/bookings/me");
    expect(shipperRes.status).toBe(200);
    expect(shipperRes.body.bookings.length).toBe(1);

    const otherShipperRes = await otherShipperAgent.get("/bookings/me");
    expect(otherShipperRes.status).toBe(200);
    expect(otherShipperRes.body.bookings.length).toBe(0);

    const transporterRes = await transporterAgent.get("/bookings/me").query({ role: "transporter" });
    expect(transporterRes.status).toBe(200);
    expect(transporterRes.body.bookings.length).toBe(1);
  });

  it("GET /admin/disputes — admin-only, lists disputes across all users", async () => {
    const { agent: nonAdminAgent } = await signupUser(app, { email: emailFor(12), name: "NotAdmin", roles: ["shipper"] });
    const blocked = await nonAdminAgent.get("/admin/disputes");
    expect(blocked.status).toBe(403);

    const { agent: adminAgent, user: admin } = await signupUser(app, { email: emailFor(13), name: "Admin" });
    await makeAdmin(admin, "support");
    const res = await adminAgent.get("/admin/disputes");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("GET /disputes/me — only shows disputes the caller raised or is named against", async () => {
    const { agent: transporterAgent, user: transporter } = await signupUser(app, {
      email: emailFor(14),
      name: "T",
      roles: ["transporter"],
    });
    const { agent: shipperAgent, user: shipper } = await signupUser(app, {
      email: emailFor(15),
      name: "S",
      roles: ["shipper"],
    });
    const { agent: strangerAgent } = await signupUser(app, { email: emailFor(16), name: "X", roles: ["shipper"] });

    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);
    await Dispute.create({
      booking: bookingId,
      raisedBy: shipper._id,
      againstUser: transporter._id,
      category: "damaged_goods",
      description: "Goods arrived damaged",
    });

    const shipperRes = await shipperAgent.get("/disputes/me");
    expect(shipperRes.status).toBe(200);
    expect(shipperRes.body.disputes.length).toBe(1);

    const transporterRes = await transporterAgent.get("/disputes/me");
    expect(transporterRes.status).toBe(200);
    expect(transporterRes.body.disputes.length).toBe(1);

    const strangerRes = await strangerAgent.get("/disputes/me");
    expect(strangerRes.status).toBe(200);
    expect(strangerRes.body.disputes.length).toBe(0);
  });
});
