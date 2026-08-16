const app = require("../../app");
const User = require("../../models/userModel");
const { signupUser, makeAdmin } = require("../helpers");

const emailFor = (seed) => `user${seed}@example.test`;

describe("scoped admin roles (requireAdminScope)", () => {
  it("lets any admin scope reach a read-only admin endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(1), name: "Admin" });
    await makeAdmin(user, "finance");

    const res = await agent.get("/admin/dashboard");
    expect(res.status).toBe(200);
  });

  it("lets a finance-scoped admin reach a finance-gated write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Admin" });
    await makeAdmin(user, "finance");
    const { user: target } = await signupUser(app, { email: emailFor(3), name: "Target", roles: ["shipper"] });

    const res = await agent
      .post(`/admin/wallets/${target._id}/adjust`)
      .send({ amount: 10, direction: "credit", reason: "test" });
    expect(res.status).toBe(200);
  });

  it("blocks a finance-scoped admin from a full-only write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(4), name: "Admin" });
    await makeAdmin(user, "finance");
    const { user: target } = await signupUser(app, { email: emailFor(5), name: "Target", roles: ["shipper"] });

    const res = await agent.put(`/admin/users/${target._id}/status`).send({ status: "suspended", reason: "x" });
    expect(res.status).toBe(403);
  });

  it("blocks a finance-scoped admin from a verification-only write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(6), name: "Admin" });
    await makeAdmin(user, "finance");

    const res = await agent.put("/trucks/000000000000000000000000/review").send({ status: "verified" });
    expect(res.status).toBe(403);
  });

  it("blocks a support-scoped admin from a finance-gated write endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(7), name: "Admin" });
    await makeAdmin(user, "support");
    const { user: target } = await signupUser(app, { email: emailFor(8), name: "Target", roles: ["shipper"] });

    const res = await agent
      .post(`/admin/wallets/${target._id}/adjust`)
      .send({ amount: 10, direction: "credit", reason: "test" });
    expect(res.status).toBe(403);
  });

  it("lets a full-scope admin reach every scope-gated endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(9), name: "Admin" });
    await makeAdmin(user, "full");
    const { user: target } = await signupUser(app, { email: emailFor(10), name: "Target", roles: ["shipper"] });

    const financeRes = await agent
      .post(`/admin/wallets/${target._id}/adjust`)
      .send({ amount: 10, direction: "credit", reason: "test" });
    expect(financeRes.status).toBe(200);

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
