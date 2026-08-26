// Covers the mobile-app-specific additions alongside the existing browser
// Web Push flow (backend/tests/integration/notificationsAndMeta.test.js):
// native FCM device-token registration (deviceTokenModel.js) and the
// app-version-gate config endpoint (PlatformSetting.mobile).
const request = require("supertest");
const app = require("../../app");
const DeviceToken = require("../../models/deviceTokenModel");
const { signupUser, makeAdmin } = require("../helpers");

const emailFor = (seed) => `mobilepush${seed}@example.test`;

describe("push: POST /push/device/register and /push/device/unregister", () => {
  it("registers a device token", async () => {
    const { agent } = await signupUser(app, { email: emailFor(1), name: "T", roles: ["transporter"] });
    const res = await agent.post("/push/device/register").send({ token: "fcm-token-1", platform: "android" });
    expect(res.status).toBe(200);

    const stored = await DeviceToken.findOne({ token: "fcm-token-1" });
    expect(stored).not.toBeNull();
    expect(stored.platform).toBe("android");
  });

  it("re-registering the same token (upsert path) still returns 200, not a duplicate-key error", async () => {
    const { agent } = await signupUser(app, { email: emailFor(2), name: "T", roles: ["transporter"] });
    const first = await agent.post("/push/device/register").send({ token: "fcm-token-2", platform: "ios" });
    expect(first.status).toBe(200);
    const second = await agent.post("/push/device/register").send({ token: "fcm-token-2", platform: "ios" });
    expect(second.status).toBe(200);

    expect(await DeviceToken.countDocuments({ token: "fcm-token-2" })).toBe(1);
  });

  it("reassigns an existing token to a different user who registers with it (shared-device case)", async () => {
    const { agent: agentA, user: userA } = await signupUser(app, { email: emailFor(3), name: "A", roles: ["shipper"] });
    const { agent: agentB, user: userB } = await signupUser(app, { email: emailFor(4), name: "B", roles: ["shipper"] });

    await agentA.post("/push/device/register").send({ token: "fcm-shared", platform: "android" });
    const res = await agentB.post("/push/device/register").send({ token: "fcm-shared", platform: "android" });
    expect(res.status).toBe(200);

    const stored = await DeviceToken.findOne({ token: "fcm-shared" });
    expect(String(stored.user)).toBe(String(userB._id));
    expect(String(stored.user)).not.toBe(String(userA._id));
  });

  it("400s registration with an invalid platform", async () => {
    const { agent } = await signupUser(app, { email: emailFor(5), name: "T", roles: ["transporter"] });
    const res = await agent.post("/push/device/register").send({ token: "fcm-token-5", platform: "windows" });
    expect(res.status).toBe(400);
  });

  it("unregisters a device token", async () => {
    const { agent } = await signupUser(app, { email: emailFor(6), name: "T", roles: ["transporter"] });
    await agent.post("/push/device/register").send({ token: "fcm-token-6", platform: "android" });

    const res = await agent.post("/push/device/unregister").send({ token: "fcm-token-6" });
    expect(res.status).toBe(200);
    expect(await DeviceToken.findOne({ token: "fcm-token-6" })).toBeNull();
  });

  it("401s register/unregister with no auth", async () => {
    const registerRes = await request(app).post("/push/device/register").send({ token: "x", platform: "android" });
    expect(registerRes.status).toBe(401);
    const unregisterRes = await request(app).post("/push/device/unregister").send({ token: "x" });
    expect(unregisterRes.status).toBe(401);
  });
});

describe("meta: GET /meta/mobile-config", () => {
  it("returns 200 with sane defaults, no auth required", async () => {
    const res = await request(app).get("/meta/mobile-config");
    expect(res.status).toBe(200);
    expect(res.body.config).toMatchObject({
      minSupportedVersion: expect.any(String),
      latestVersion: expect.any(String),
      forceUpdate: expect.any(Boolean),
      maintenanceMode: expect.any(Boolean),
    });
  });
});

describe("admin: PUT /admin/settings/mobile-config", () => {
  it("lets a full-scope admin update the mobile config, and it's reflected on the public endpoint", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(7), name: "Admin" });
    await makeAdmin(user, "full");

    const res = await agent.put("/admin/settings/mobile-config").send({
      minSupportedVersion: "1.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      maintenanceMode: false,
    });
    expect(res.status).toBe(200);

    const publicRes = await request(app).get("/meta/mobile-config");
    expect(publicRes.body.config).toEqual({
      minSupportedVersion: "1.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      maintenanceMode: false,
    });
  });

  it("blocks a non-full-scope admin", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(8), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.put("/admin/settings/mobile-config").send({
      minSupportedVersion: "1.0.0",
      latestVersion: "1.0.0",
      forceUpdate: false,
      maintenanceMode: false,
    });
    expect(res.status).toBe(403);
  });

  it("rejects a malformed version string", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(9), name: "Admin" });
    await makeAdmin(user, "full");

    const res = await agent.put("/admin/settings/mobile-config").send({
      minSupportedVersion: "not-a-version",
      latestVersion: "1.0.0",
      forceUpdate: false,
      maintenanceMode: false,
    });
    expect(res.status).toBe(400);
  });
});
