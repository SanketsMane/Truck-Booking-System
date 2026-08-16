const request = require("supertest");
const app = require("../../app");
const { signupUser, makeAdmin, uploadTestFile } = require("../helpers");

const emailFor = (seed) => `intmisc${seed}@example.test`;

describe("GET /admin/integrations", () => {
  it("returns the sms/email/kyc provider blocks in their default unconfigured state, for any admin scope", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(1), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.get("/admin/integrations");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.integrations.sms).toMatchObject({ provider: "console", configured: false, config: {} });
    expect(res.body.integrations.email).toMatchObject({ provider: "console", configured: false, config: {} });
    expect(res.body.integrations.kyc).toMatchObject({ provider: "manual", configured: false, config: {} });
  });
});

describe("PUT /admin/integrations/* (requireAdminScope('full'))", () => {
  it("blocks a non-full-scope admin from every integrations write route", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Admin" });
    await makeAdmin(user, "support");

    const smsRes = await agent.put("/admin/integrations/sms").send({ provider: "console", config: {} });
    expect(smsRes.status).toBe(403);

    const emailRes = await agent.put("/admin/integrations/email").send({ provider: "console", config: {} });
    expect(emailRes.status).toBe(403);

    const kycRes = await agent.put("/admin/integrations/kyc").send({ provider: "manual", config: {} });
    expect(kycRes.status).toBe(403);
  });
});

describe("POST /admin/integrations/*/test", () => {
  it("returns 400 'before testing' for sms/email since no real provider is configured in this env", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(3), name: "Admin" });
    await makeAdmin(user, "full");

    const smsRes = await agent.post("/admin/integrations/sms/test").send({ mobile: "9876543210" });
    expect(smsRes.status).toBe(400);
    expect(smsRes.body).toMatchObject({ success: false, msg: "Save a real SMS provider before testing" });

    const emailRes = await agent.post("/admin/integrations/email/test").send({ to: "someone@example.test" });
    expect(emailRes.status).toBe(400);
    expect(emailRes.body).toMatchObject({ success: false, msg: "Save a real email provider before testing" });
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
