const app = require("../../app");
const User = require("../../models/userModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `user${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

// A dispute can only be raised on a completed booking, so the scoped-write
// exemplar below (PUT /admin/disputes/:id/resolve, "support" scope) needs
// one driven all the way through the lifecycle first — same pattern as
// supportAndRatingModeration.test.js's buildCompletedRating.
const buildDispute = async (seed) => {
  const { agent: transporterAgent } = await signupUser(app, {
    email: `scope-transporter-${seed}@example.test`,
    name: "Transporter",
    roles: ["transporter"],
  });
  const { agent: shipperAgent } = await signupUser(app, {
    email: `scope-shipper-${seed}@example.test`,
    name: "Shipper",
    roles: ["shipper"],
  });

  const trip = await postTestTrip(transporterAgent);
  const bookingRes = await shipperAgent
    .post("/bookings")
    .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
  const bookingId = bookingRes.body.booking._id;

  await transporterAgent.put(`/bookings/${bookingId}/accept`);
  await shipperAgent.put(`/bookings/${bookingId}/confirm-pickup`);
  await transporterAgent.put(`/bookings/${bookingId}/confirm-drop`);

  const disputeRes = await shipperAgent
    .post("/disputes")
    .send({ bookingId, category: "no_show", description: "Truck never arrived at pickup" });

  return disputeRes.body.dispute._id;
};

describe("scoped admin roles (requireAdminScope)", () => {
  it("lets any admin scope reach a read-only admin endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(1), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.get("/admin/dashboard");
    expect(res.status).toBe(200);
  });

  it("lets a support-scoped admin reach a support-gated write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Admin" });
    await makeAdmin(user, "support");
    const disputeId = await buildDispute(2);

    const res = await agent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "resolved", resolutionAction: "warning_issued", resolutionNote: "Warned the transporter" });
    expect(res.status).toBe(200);
  });

  it("blocks a support-scoped admin from a full-only write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(4), name: "Admin" });
    await makeAdmin(user, "support");
    const { user: target } = await signupUser(app, { email: emailFor(5), name: "Target", roles: ["shipper"] });

    const res = await agent.put(`/admin/users/${target._id}/status`).send({ status: "suspended", reason: "x" });
    expect(res.status).toBe(403);
  });

  it("blocks a support-scoped admin from a verification-only write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(6), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.put("/trucks/000000000000000000000000/review").send({ status: "verified" });
    expect(res.status).toBe(403);
  });

  it("blocks a verification-scoped admin from a support-gated write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(7), name: "Admin" });
    await makeAdmin(user, "verification");
    const disputeId = await buildDispute(7);

    const res = await agent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "resolved", resolutionAction: "none", resolutionNote: "n/a" });
    expect(res.status).toBe(403);
  });

  it("lets a content-scoped admin create a post, but blocks it from a support-gated write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(11), name: "Admin" });
    await makeAdmin(user, "content");

    const postRes = await agent.post("/admin/posts").send({
      type: "blog",
      title: "Content Scope Test Post",
      excerpt: "A quick test.",
      body: "<p>hello</p>",
    });
    expect(postRes.status).toBe(201);

    const disputeId = await buildDispute(11);
    const disputeRes = await agent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "resolved", resolutionAction: "none", resolutionNote: "n/a" });
    expect(disputeRes.status).toBe(403);
  });

  it("blocks a support-scoped admin from the content-gated post-create endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(12), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.post("/admin/posts").send({
      type: "blog",
      title: "Should Not Be Created",
      excerpt: "n/a",
      body: "<p>x</p>",
    });
    expect(res.status).toBe(403);
  });

  it("lets a full-scope admin reach every scope-gated endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(9), name: "Admin" });
    await makeAdmin(user, "full");
    const { user: target } = await signupUser(app, { email: emailFor(10), name: "Target", roles: ["shipper"] });
    const disputeId = await buildDispute(9);

    const supportRes = await agent
      .put(`/admin/disputes/${disputeId}/resolve`)
      .send({ status: "resolved", resolutionAction: "none", resolutionNote: "n/a" });
    expect(supportRes.status).toBe(200);

    const fullRes = await agent.put(`/admin/users/${target._id}/status`).send({ status: "suspended", reason: "x" });
    expect(fullRes.status).toBe(200);
  });

  it("rejects a non-admin entirely, regardless of scope-gated vs plain requireAdmin routes", async () => {
    const { agent } = await signupUser(app, { email: emailFor(11), name: "NotAdmin", roles: ["shipper"] });

    const res = await agent.get("/admin/dashboard");
    expect(res.status).toBe(403);
  });

  it("blocks an admin from changing their own admin access via the admin-role endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(12), name: "Admin" });
    await makeAdmin(user, "full");

    const res = await agent.put(`/admin/users/${user._id}/admin-role`).send({ isAdmin: true, adminScope: "full" });
    expect(res.status).toBe(400);
  });

  it("grants a scoped admin role through the real admin-role endpoint, invalidating the target's existing session", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(13), name: "Admin" });
    await makeAdmin(user, "full");
    const { agent: targetAgent, user: target } = await signupUser(app, {
      email: emailFor(14),
      name: "Target",
      roles: ["shipper"],
    });

    const grantRes = await agent
      .put(`/admin/users/${target._id}/admin-role`)
      .send({ isAdmin: true, adminScope: "support" });
    expect(grantRes.status).toBe(200);
    expect(grantRes.body.user.adminScope).toBe("support");

    const persisted = await User.findById(target._id);
    expect(persisted.isAdmin).toBe(true);
    expect(persisted.adminScope).toBe("support");

    // setAdminRole bumps sessionVersion the same way setUserStatus does —
    // the target's pre-existing session token embeds the old sessionVersion
    // and is now stale, so their old cookie no longer authenticates at all
    // (they'd need to log in again to get a token with the current
    // sessionVersion — the other tests in this file already cover that a
    // freshly-authenticated scoped admin is recognized immediately, since
    // authMiddleware always re-reads isAdmin/adminScope from the DB).
    const staleRes = await targetAgent.get("/admin/dashboard");
    expect(staleRes.status).toBe(401);
  });
});
