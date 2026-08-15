const request = require("supertest");
const app = require("../../app");
const Dispute = require("../../models/disputeModel");
const razorpayProvider = require("../../utils/razorpayProvider");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `gap${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

// Closes the last few endpoints left uncovered after the rest of this
// sweep: the KYC/payout integration routes added this session (only their
// underlying provider functions had unit tests before this), listMyBookings,
// the booking-specific Razorpay pay routes, and the two dispute list routes.
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

    const { agent: financeAgent, user: financeAdmin } = await signupUser(app, { email: emailFor(2), name: "Admin2" });
    await makeAdmin(financeAdmin, "finance");
    const blocked = await financeAgent.put("/admin/integrations/kyc").send({ provider: "manual", config: {} });
    expect(blocked.status).toBe(403);
  });

  it("PUT /admin/integrations/payout — full-scope admin saves manual and custom_http config; other scopes are blocked", async () => {
    const { agent: fullAgent, user: fullAdmin } = await signupUser(app, { email: emailFor(3), name: "Admin" });
    await makeAdmin(fullAdmin, "full");

    const manualRes = await fullAgent.put("/admin/integrations/payout").send({ provider: "manual", config: {} });
    expect(manualRes.status).toBe(200);

    const httpRes = await fullAgent
      .put("/admin/integrations/payout")
      .send({ provider: "custom_http", config: { url: "https://payout.example.com/pay" } });
    expect(httpRes.status).toBe(200);

    const check = await fullAgent.get("/admin/integrations");
    expect(check.body.integrations.payout.provider).toBe("custom_http");
    expect(check.body.integrations.payout.configured).toBe(true);

    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { email: emailFor(4), name: "Admin2" });
    await makeAdmin(supportAdmin, "support");
    const blocked = await supportAgent.put("/admin/integrations/payout").send({ provider: "manual", config: {} });
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

  it("POST /bookings/:id/pay/razorpay/order — 400 while Razorpay isn't configured (default dev/test state)", async () => {
    const { agent: transporterAgent } = await signupUser(app, { email: emailFor(8), name: "T", roles: ["transporter"] });
    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(9), name: "S", roles: ["shipper"] });

    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);

    const orderRes = await shipperAgent.post(`/bookings/${bookingId}/pay/razorpay/order`);
    expect(orderRes.status).toBe(400);
    expect(orderRes.body.msg).toMatch(/isn't configured yet/);
  });

  it("POST /bookings/:id/pay/razorpay/verify — 404 for a booking with no matching payment order", async () => {
    const { agent: transporterAgent } = await signupUser(app, { email: emailFor(10), name: "T", roles: ["transporter"] });
    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(11), name: "S", roles: ["shipper"] });

    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;
    await transporterAgent.put(`/bookings/${bookingId}/accept`);

    const verifyRes = await shipperAgent.post(`/bookings/${bookingId}/pay/razorpay/verify`).send({
      razorpay_order_id: "order_doesnotexist",
      razorpay_payment_id: "pay_doesnotexist",
      razorpay_signature: "bogus",
    });
    expect(verifyRes.status).toBe(404);
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

  it("POST /webhooks/razorpay — 400 when no webhook secret is configured (default dev/test state)", async () => {
    const res = await request(app)
      .post("/webhooks/razorpay")
      .set("x-razorpay-signature", "bogus")
      .send({ event: "payment.captured", payload: {} });
    expect(res.status).toBe(400);
  });

  it("POST /webhooks/razorpay — 400 on a signature that doesn't match a configured secret", async () => {
    await razorpayProvider.setConfig("razorpay", { keyId: "key_test", keySecret: "secret_test", webhookSecret: "whsec_test" }, null);
    const res = await request(app)
      .post("/webhooks/razorpay")
      .set("x-razorpay-signature", "definitely-not-a-valid-hmac")
      .send({ event: "payment.captured", payload: {} });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/invalid webhook signature/i);
  });
});
