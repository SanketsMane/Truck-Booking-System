// Covers the new mobile bearer-token auth path (backend/controllers/
// authController.js's issueMobileTokens/mobileRefresh/mobileLogout) —
// additive alongside the existing cookie session, which stays covered by
// the rest of the suite untouched.
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/userModel");
const RefreshToken = require("../../models/refreshTokenModel");
const { MASTER_OTP, uniqueMobile } = require("../helpers");

const emailFor = (seed) => `mobileauth${seed}@example.test`;

// Mirrors helpers.signupUser's OTP flow, but as plain (non-agent) requests
// with the mobile client header — mobile has no cookie jar to carry, so
// there's no reason to use a cookie-jar-backed supertest agent here.
const mobileVerifyOtp = async (email, overrides = {}) => {
  await request(app).post("/auth/request-otp").send({ email });
  return request(app)
    .post("/auth/verify-otp")
    .set("X-Client-Type", "mobile")
    .send({
      email,
      otp: MASTER_OTP,
      name: overrides.name || "Mobile Tester",
      mobile: overrides.mobile || uniqueMobile(email),
      roles: overrides.roles || ["shipper"],
      deviceId: overrides.deviceId || "device-1",
      deviceInfo: overrides.deviceInfo || "Pixel 8, Android 15",
      platform: overrides.platform || "android",
    });
};

describe("Mobile login/signup — bearer tokens issued alongside the cookie", () => {
  it("returns accessToken + refreshToken in the body when X-Client-Type: mobile is sent", async () => {
    const res = await mobileVerifyOtp(emailFor(1));
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.tokens.refreshToken).toMatch(/^[0-9a-f]{64}$/);

    const user = await User.findOne({ email: emailFor(1) });
    const stored = await RefreshToken.findOne({ user: user._id });
    expect(stored).not.toBeNull();
    expect(stored.deviceId).toBe("device-1");
    expect(stored.platform).toBe("android");
    // The raw token is never persisted — only its hash.
    expect(stored.tokenHash).not.toBe(res.body.tokens.refreshToken);
  });

  it("does NOT include tokens for a plain web request (no X-Client-Type header)", async () => {
    const email = emailFor(2);
    await request(app).post("/auth/request-otp").send({ email });
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ email, otp: MASTER_OTP, name: "Web Tester", mobile: uniqueMobile(email), roles: ["shipper"] });

    expect(res.status).toBe(200);
    expect(res.body.tokens).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("also issues tokens on password-based signup and login for a mobile client", async () => {
    const email = emailFor(3);
    const signupRes = await request(app)
      .post("/auth/signup")
      .set("X-Client-Type", "mobile")
      .send({
        name: "Mobile Signup",
        mobile: uniqueMobile(email),
        email,
        password: "Passw0rd!",
        confirmPassword: "Passw0rd!",
        roles: ["transporter"],
      });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.tokens.accessToken).toEqual(expect.any(String));

    const loginRes = await request(app)
      .post("/auth/login-password")
      .set("X-Client-Type", "mobile")
      .send({ email, password: "Passw0rd!" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.tokens.refreshToken).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Bearer access token authenticates REST requests (no cookie at all)", () => {
  it("authenticates GET /auth/profile via Authorization: Bearer with zero cookies sent", async () => {
    const res = await mobileVerifyOtp(emailFor(4));
    const { accessToken } = res.body.tokens;

    const profileRes = await request(app).get("/auth/profile").set("Authorization", `Bearer ${accessToken}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.email).toBe(emailFor(4));
  });

  it("rejects a request with no bearer header and no cookie", async () => {
    const res = await request(app).get("/auth/profile");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage bearer token", async () => {
    const res = await request(app).get("/auth/profile").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/mobile/refresh", () => {
  it("rotates the refresh token and issues a working new access token", async () => {
    const loginRes = await mobileVerifyOtp(emailFor(5));
    const { refreshToken: oldRefresh } = loginRes.body.tokens;

    const refreshRes = await request(app).post("/auth/mobile/refresh").send({ refreshToken: oldRefresh });
    expect(refreshRes.status).toBe(200);
    const { accessToken: newAccess, refreshToken: newRefresh } = refreshRes.body.tokens;
    expect(newRefresh).not.toBe(oldRefresh);

    const profileRes = await request(app).get("/auth/profile").set("Authorization", `Bearer ${newAccess}`);
    expect(profileRes.status).toBe(200);
  });

  it("detects reuse of an already-rotated token and revokes the whole device family", async () => {
    const loginRes = await mobileVerifyOtp(emailFor(6));
    const { refreshToken: firstToken } = loginRes.body.tokens;

    const firstRefresh = await request(app).post("/auth/mobile/refresh").send({ refreshToken: firstToken });
    expect(firstRefresh.status).toBe(200);
    const { refreshToken: secondToken } = firstRefresh.body.tokens;

    // Reusing the now-rotated-out firstToken is the theft signal.
    const reuseAttempt = await request(app).post("/auth/mobile/refresh").send({ refreshToken: firstToken });
    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.msg).toMatch(/compromised/i);

    // The legitimate, newer token is now revoked too — reuse detection
    // burns the whole chain, not just the replayed token.
    const secondRefreshAttempt = await request(app).post("/auth/mobile/refresh").send({ refreshToken: secondToken });
    expect(secondRefreshAttempt.status).toBe(401);
  });

  it("rejects an unknown token", async () => {
    const res = await request(app)
      .post("/auth/mobile/refresh")
      .send({ refreshToken: "a".repeat(64) });
    expect(res.status).toBe(401);
  });

  it("rejects a malformed token at the validator", async () => {
    const res = await request(app).post("/auth/mobile/refresh").send({ refreshToken: "too-short" });
    expect(res.status).toBe(400);
  });

  it("blocks refreshing for a banned account", async () => {
    const loginRes = await mobileVerifyOtp(emailFor(7));
    const { refreshToken } = loginRes.body.tokens;
    await User.updateOne({ email: emailFor(7) }, { $set: { status: "banned" } });

    const res = await request(app).post("/auth/mobile/refresh").send({ refreshToken });
    expect(res.status).toBe(403);
  });
});

describe("POST /auth/mobile/logout", () => {
  it("revokes only that device's refresh token", async () => {
    const loginRes = await mobileVerifyOtp(emailFor(8));
    const { refreshToken } = loginRes.body.tokens;

    const logoutRes = await request(app).post("/auth/mobile/logout").send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const stored = await RefreshToken.findOne({ user: (await User.findOne({ email: emailFor(8) }))._id });
    expect(stored.revokedAt).not.toBeNull();

    const refreshAfterLogout = await request(app).post("/auth/mobile/refresh").send({ refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("is idempotent — logging out an already-revoked/unknown token still 200s", async () => {
    const res = await request(app)
      .post("/auth/mobile/logout")
      .send({ refreshToken: "b".repeat(64) });
    expect(res.status).toBe(200);
  });
});
