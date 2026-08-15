const request = require("supertest");
const app = require("../../app");
const {
  signupUser,
  makeAdmin,
  disableVerificationGate,
  postTestTrip,
  uploadTestFile,
} = require("../helpers");

const emailFor = (seed) => `finmisc${seed}@example.test`;

describe("GET /admin/integrations", () => {
  it("returns the sms/email/razorpay/kyc/payout provider blocks in their default unconfigured state, for any admin scope", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(1), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.get("/admin/integrations");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.integrations.sms).toMatchObject({ provider: "console", configured: false, config: {} });
    expect(res.body.integrations.email).toMatchObject({ provider: "console", configured: false, config: {} });
    expect(res.body.integrations.razorpay).toMatchObject({ provider: "none", configured: false, config: {} });
    expect(res.body.integrations.kyc).toMatchObject({ provider: "manual", configured: false, config: {} });
    expect(res.body.integrations.payout).toMatchObject({ provider: "manual", configured: false, config: {} });
  });
});

describe("PUT /admin/integrations/* (requireAdminScope('full'))", () => {
  it("blocks a non-full-scope admin from every integrations write route", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Admin" });
    await makeAdmin(user, "finance");

    const smsRes = await agent.put("/admin/integrations/sms").send({ provider: "console", config: {} });
    expect(smsRes.status).toBe(403);

    const emailRes = await agent.put("/admin/integrations/email").send({ provider: "console", config: {} });
    expect(emailRes.status).toBe(403);

    const razorpayRes = await agent.put("/admin/integrations/razorpay").send({ provider: "none", config: {} });
    expect(razorpayRes.status).toBe(403);
  });
});

describe("POST /admin/integrations/*/test", () => {
  it("returns 400 'before testing' for sms/email/razorpay since no real provider is configured in this env", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(3), name: "Admin" });
    await makeAdmin(user, "full");

    const smsRes = await agent.post("/admin/integrations/sms/test").send({ mobile: "9876543210" });
    expect(smsRes.status).toBe(400);
    expect(smsRes.body).toMatchObject({ success: false, msg: "Save a real SMS provider before testing" });

    const emailRes = await agent.post("/admin/integrations/email/test").send({ to: "someone@example.test" });
    expect(emailRes.status).toBe(400);
    expect(emailRes.body).toMatchObject({ success: false, msg: "Save a real email provider before testing" });

    const razorpayRes = await agent.post("/admin/integrations/razorpay/test").send({});
    expect(razorpayRes.status).toBe(400);
    expect(razorpayRes.body).toMatchObject({ success: false, msg: "Save your Razorpay keys before testing" });
  });
});

describe("GET /admin/payments, /admin/wallets, /admin/platform-wallet/transactions", () => {
  it("returns a paginated 200 for an admin (any scope), and 403 for a non-admin", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(4), name: "Admin" });
    await makeAdmin(user, "support");
    const { agent: nonAdminAgent } = await signupUser(app, { email: emailFor(5), name: "Shipper", roles: ["shipper"] });

    const paymentsRes = await agent.get("/admin/payments");
    expect(paymentsRes.status).toBe(200);
    expect(paymentsRes.body.success).toBe(true);
    expect(paymentsRes.body).toMatchObject({ items: expect.any(Array), total: expect.any(Number), page: 1, limit: 20 });

    const walletsRes = await agent.get("/admin/wallets");
    expect(walletsRes.status).toBe(200);
    expect(walletsRes.body.success).toBe(true);
    expect(Array.isArray(walletsRes.body.items)).toBe(true);

    const platformTxRes = await agent.get("/admin/platform-wallet/transactions");
    expect(platformTxRes.status).toBe(200);
    expect(platformTxRes.body.success).toBe(true);
    expect(Array.isArray(platformTxRes.body.items)).toBe(true);

    const forbiddenPayments = await nonAdminAgent.get("/admin/payments");
    expect(forbiddenPayments.status).toBe(403);
    const forbiddenWallets = await nonAdminAgent.get("/admin/wallets");
    expect(forbiddenWallets.status).toBe(403);
    const forbiddenPlatformTx = await nonAdminAgent.get("/admin/platform-wallet/transactions");
    expect(forbiddenPlatformTx.status).toBe(403);
  });
});

describe("withdrawal admin lifecycle (requireAdminScope('finance'))", () => {
  it("moves a withdrawal pending -> approved -> paid, blocking a support-scope-only admin at every write step", async () => {
    const { agent: financeAgent, user: financeAdmin } = await signupUser(app, { email: emailFor(6), name: "Finance Admin" });
    await makeAdmin(financeAdmin, "finance");
    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { email: emailFor(7), name: "Support Admin" });
    await makeAdmin(supportAdmin, "support");
    const { agent: transporterAgent, user: transporter } = await signupUser(app, {
      email: emailFor(8),
      name: "Transporter",
      roles: ["transporter"],
    });

    // Credit the transporter's wallet so they have balance to withdraw from.
    const creditRes = await financeAgent
      .post(`/admin/wallets/${transporter._id}/adjust`)
      .send({ amount: 1000, direction: "credit", reason: "test funding" });
    expect(creditRes.status).toBe(200);

    const withdrawRes = await transporterAgent.post("/wallet/withdrawals").send({
      amount: 400,
      payoutMethod: "upi",
      upiId: "transporter@upi",
    });
    expect(withdrawRes.status).toBe(201);
    const withdrawalId = withdrawRes.body.request._id;

    // Shows up as pending in the admin list.
    const listRes = await financeAgent.get("/admin/withdrawals").query({ status: "pending" });
    expect(listRes.status).toBe(200);
    const listed = listRes.body.items.find((item) => item._id === withdrawalId);
    expect(listed).toBeTruthy();
    expect(listed.status).toBe("pending");

    // A support-scope-only admin can't approve/reject/mark-paid.
    const supportApprove = await supportAgent.put(`/admin/withdrawals/${withdrawalId}/approve`);
    expect(supportApprove.status).toBe(403);

    // Approve — no payout provider is configured by default, so this stays
    // "approved" rather than auto-paying (see payoutProvider.initiatePayout,
    // which returns null for the default "manual" provider).
    const approveRes = await financeAgent.put(`/admin/withdrawals/${withdrawalId}/approve`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.msg).toBe("Withdrawal approved");
    expect(approveRes.body.request.status).toBe("approved");

    const supportMarkPaid = await supportAgent
      .put(`/admin/withdrawals/${withdrawalId}/mark-paid`)
      .send({ payoutReference: "SHOULD-NOT-APPLY" });
    expect(supportMarkPaid.status).toBe(403);

    const markPaidRes = await financeAgent
      .put(`/admin/withdrawals/${withdrawalId}/mark-paid`)
      .send({ payoutReference: "UTR123456" });
    expect(markPaidRes.status).toBe(200);
    expect(markPaidRes.body.success).toBe(true);
    expect(markPaidRes.body.request.status).toBe("paid");
    expect(markPaidRes.body.request.payoutReference).toBe("UTR123456");
  });

  it("rejects a pending withdrawal and refunds the wallet, blocked for a support-scope-only admin", async () => {
    const { agent: financeAgent, user: financeAdmin } = await signupUser(app, { email: emailFor(9), name: "Finance Admin" });
    await makeAdmin(financeAdmin, "finance");
    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { email: emailFor(10), name: "Support Admin" });
    await makeAdmin(supportAdmin, "support");
    const { agent: transporterAgent, user: transporter } = await signupUser(app, {
      email: emailFor(11),
      name: "Transporter",
      roles: ["transporter"],
    });

    await financeAgent
      .post(`/admin/wallets/${transporter._id}/adjust`)
      .send({ amount: 1000, direction: "credit", reason: "test funding" });

    const withdrawRes = await transporterAgent.post("/wallet/withdrawals").send({
      amount: 300,
      payoutMethod: "upi",
      upiId: "transporter@upi",
    });
    const withdrawalId = withdrawRes.body.request._id;

    const supportReject = await supportAgent.put(`/admin/withdrawals/${withdrawalId}/reject`).send({ reason: "nope" });
    expect(supportReject.status).toBe(403);

    const rejectRes = await financeAgent.put(`/admin/withdrawals/${withdrawalId}/reject`).send({ reason: "Bad UPI ID" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.request.status).toBe("rejected");

    // The 300 debited at request time is refunded back — wallet returns to 1000.
    const walletRes = await transporterAgent.get("/wallet/me");
    expect(walletRes.body.wallet.balance).toBe(1000);
  });
});

describe("/payment-logs (requireAdminScope('finance'))", () => {
  it("lets a finance-scope admin set and read a payment log for a real booking, blocking a non-finance admin from writing", async () => {
    await disableVerificationGate();
    const { agent: transporterAgent } = await signupUser(app, {
      email: emailFor(12),
      name: "Transporter",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, { email: emailFor(13), name: "Shipper", roles: ["shipper"] });
    const { agent: financeAgent, user: financeAdmin } = await signupUser(app, { email: emailFor(14), name: "Finance Admin" });
    await makeAdmin(financeAdmin, "finance");
    const { agent: supportAgent, user: supportAdmin } = await signupUser(app, { email: emailFor(15), name: "Support Admin" });
    await makeAdmin(supportAdmin, "support");

    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent.post("/bookings").send({
      tripId: trip._id,
      capacityRequested: 5,
      goodsDescription: "Steel rods",
    });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.booking._id;

    const forbiddenSet = await supportAgent.post("/payment-logs").send({ bookingId, amount: 5000, status: "paid" });
    expect(forbiddenSet.status).toBe(403);

    const setRes = await financeAgent.post("/payment-logs").send({ bookingId, amount: 5000, status: "paid" });
    expect(setRes.status).toBe(200);
    expect(setRes.body.success).toBe(true);
    expect(setRes.body.log).toMatchObject({ booking: bookingId, amount: 5000, status: "paid" });

    const listRes = await financeAgent.get("/payment-logs");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    const foundInList = listRes.body.logs.find((log) => log.booking && log.booking._id === bookingId);
    expect(foundInList).toBeTruthy();
    expect(foundInList).toMatchObject({ amount: 5000, status: "paid" });

    // Not scope-gated (just authMiddleware) — an admin of any scope, or a
    // party to the booking, can read it back.
    const byBookingRes = await financeAgent.get(`/payment-logs/booking/${bookingId}`);
    expect(byBookingRes.status).toBe(200);
    expect(byBookingRes.body.success).toBe(true);
    expect(byBookingRes.body.log).toMatchObject({ amount: 5000, status: "paid" });
  });
});

describe("POST /auth/logout", () => {
  it("invalidates the session so the same cookie no longer authenticates afterwards", async () => {
    const { agent } = await signupUser(app, { email: emailFor(16), name: "User", roles: ["shipper"] });

    const beforeRes = await agent.get("/auth/profile");
    expect(beforeRes.status).toBe(200);

    const logoutRes = await agent.post("/auth/logout");
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toMatchObject({ success: true, msg: "Logout successful" });

    // logout() both clears the cookie and bumps sessionVersion server-side —
    // either one alone would be enough to reject the next request, so this
    // just asserts the observable outcome: the same agent (same cookie jar)
    // is unauthenticated on its very next authed request.
    const afterRes = await agent.get("/auth/profile");
    expect(afterRes.status).toBe(401);
    expect(afterRes.body.success).toBe(false);
  });
});

describe("POST /auth/roles", () => {
  it("adds a new role to the account without dropping existing ones", async () => {
    const { agent } = await signupUser(app, { email: emailFor(17), name: "User", roles: ["shipper"] });

    const res = await agent.post("/auth/roles").send({ role: "transporter" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.roles).toEqual(expect.arrayContaining(["shipper", "transporter"]));

    const profileRes = await agent.get("/auth/profile");
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.roles).toEqual(expect.arrayContaining(["shipper", "transporter"]));
  });
});

describe("POST /auth/refresh", () => {
  it("reissues a session without erroring, and the new session keeps authenticating", async () => {
    const { agent } = await signupUser(app, { email: emailFor(18), name: "User", roles: ["shipper"] });

    const res = await agent.post("/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, msg: "Session refreshed" });

    const profileRes = await agent.get("/auth/profile");
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
  });
});

describe("GET /files/:id", () => {
  it("serves the content of a file uploaded via the real upload pipeline, and 404s for a nonexistent id", async () => {
    const { agent } = await signupUser(app, { email: emailFor(19), name: "User", roles: ["shipper"] });
    const fileId = await uploadTestFile(agent);

    const res = await agent.get(`/files/${fileId}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
    expect(res.body.length).toBeGreaterThan(0);

    const missingRes = await agent.get("/files/000000000000000000000000");
    expect(missingRes.status).toBe(404);
    expect(missingRes.body.success).toBe(false);
  });

  it("blocks an unauthenticated request to a private (non-public) file", async () => {
    const { agent } = await signupUser(app, { email: emailFor(20), name: "User", roles: ["shipper"] });
    const fileId = await uploadTestFile(agent);

    const res = await request(app).get(`/files/${fileId}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
