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
  // Backdate any still-cooling-down OTP resend gate (authConfig's
  // OTP_RESEND_COOLDOWN_SECONDS) before asking for a fresh one — the
  // sessions tests below deliberately log the same email in twice in
  // immediate succession (two "devices"), which a real user wouldn't do
  // inside the 30s window but this helper needs to for the scenario. A
  // no-op for a brand-new email (no matching document yet).
  await User.updateOne({ email }, { $set: { "otp.lastSentAt": new Date(0) } });
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

describe("GET /auth/mobile/sessions and DELETE /auth/mobile/sessions/:id", () => {
  it("lists only this user's own active sessions, newest first", async () => {
    const first = await mobileVerifyOtp(emailFor(9), { deviceId: "phone-1" });
    const second = await mobileVerifyOtp(emailFor(9), { deviceId: "phone-2" });
    const accessToken = second.body.tokens.accessToken;

    const res = await request(app).get("/auth/mobile/sessions").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions[0].deviceId).toBe("phone-2");
    expect(res.body.sessions[1].deviceId).toBe("phone-1");
    // Never the raw or hashed token itself.
    expect(res.body.sessions[0].tokenHash).toBeUndefined();
    expect(first.body.tokens.refreshToken).toBeTruthy();
  });

  it("revokes one session by id without affecting the others", async () => {
    const first = await mobileVerifyOtp(emailFor(10), { deviceId: "phone-1" });
    const second = await mobileVerifyOtp(emailFor(10), { deviceId: "phone-2" });

    const listRes = await request(app)
      .get("/auth/mobile/sessions")
      .set("Authorization", `Bearer ${second.body.tokens.accessToken}`);
    const phoneOneSessionId = listRes.body.sessions.find((s) => s.deviceId === "phone-1")._id;

    const revokeRes = await request(app)
      .delete(`/auth/mobile/sessions/${phoneOneSessionId}`)
      .set("Authorization", `Bearer ${second.body.tokens.accessToken}`);
    expect(revokeRes.status).toBe(200);

    const phoneOneRefresh = await request(app)
      .post("/auth/mobile/refresh")
      .send({ refreshToken: first.body.tokens.refreshToken });
    expect(phoneOneRefresh.status).toBe(401);

    const phoneTwoRefresh = await request(app)
      .post("/auth/mobile/refresh")
      .send({ refreshToken: second.body.tokens.refreshToken });
    expect(phoneTwoRefresh.status).toBe(200);
  });

  it("does not let a user revoke another user's session", async () => {
    const victim = await mobileVerifyOtp(emailFor(11), { deviceId: "phone-1" });
    const attacker = await mobileVerifyOtp(emailFor(12), { deviceId: "phone-1" });

    const listRes = await request(app)
      .get("/auth/mobile/sessions")
      .set("Authorization", `Bearer ${victim.body.tokens.accessToken}`);
    const victimSessionId = listRes.body.sessions[0]._id;

    const res = await request(app)
      .delete(`/auth/mobile/sessions/${victimSessionId}`)
      .set("Authorization", `Bearer ${attacker.body.tokens.accessToken}`);
    expect(res.status).toBe(404);

    const stillWorks = await request(app)
      .post("/auth/mobile/refresh")
      .send({ refreshToken: victim.body.tokens.refreshToken });
    expect(stillWorks.status).toBe(200);
  });

  it("401s without a bearer token", async () => {
    const res = await request(app).get("/auth/mobile/sessions");
    expect(res.status).toBe(401);
  });
});
