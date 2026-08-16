const request = require("supertest");
const app = require("../../app");
const User = require("../../models/userModel");
const { signupUser, MASTER_OTP } = require("../helpers");

const emailFor = (seed) => `auth${seed}@example.test`;

// forgotPassword fires the reset email without awaiting it (deliberately —
// a real user's response shouldn't wait on SMTP), so the console-fallback
// log line it produces can still be pending when the HTTP response comes
// back. Poll briefly rather than assuming it's already landed.
const waitForLogContaining = async (logSpy, needles, timeoutMs = 2000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = logSpy.mock.calls.find((args) => needles.every((needle) => String(args[0]).includes(needle)));
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return null;
};

// The full auth surface post mobile->email migration: OTP signup/login
// (email-keyed, mobile now optional), password signup/login (email-only —
// mobile is no longer an accepted identifier), forgot/reset password, and
// profile-driven mobile edits. console.log is globally silenced in
// tests/setup.js, but jest.spyOn still records call args without printing
// anything — that's how forgot-password's reset link (only ever "sent" via
// the console-fallback email provider in test mode) gets captured here.
describe("auth: OTP signup/login", () => {
  it("signs up a new user via email OTP with no mobile given", async () => {
    const { user } = await signupUser(app, { email: emailFor(1), name: "OTP User", roles: ["shipper"] });
    expect(user.email).toBe(emailFor(1));
    expect(user.emailVerified).toBe(true);
    expect(user.mobile).toBeUndefined();
  });

  it("logs an existing verified user back in without requiring a name again", async () => {
    await signupUser(app, { email: emailFor(2), name: "Repeat User" });
    // Bypass the real 30s resend cooldown (authConfig.OTP_RESEND_COOLDOWN_SECONDS)
    // so this second request-otp isn't itself rejected — same kind of
    // direct-DB test setup already used elsewhere in this suite (e.g.
    // bookingEdgeCases' respondBy backdating).
    await User.updateOne({ email: emailFor(2) }, { $unset: { "otp.lastSentAt": "" } });

    const agent = request.agent(app);
    await agent.post("/auth/request-otp").send({ email: emailFor(2) });
    const res = await agent.post("/auth/verify-otp").send({ email: emailFor(2), otp: MASTER_OTP });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Repeat User");
  });

  it("accepts an optional mobile number on OTP signup and rejects a duplicate", async () => {
    const agent1 = request.agent(app);
    await agent1.post("/auth/request-otp").send({ email: emailFor(3) });
    const res1 = await agent1
      .post("/auth/verify-otp")
      .send({ email: emailFor(3), otp: MASTER_OTP, name: "Has Mobile", mobile: "9876500001" });
    expect(res1.status).toBe(200);
    expect(res1.body.user.mobile).toBe("9876500001");

    const agent2 = request.agent(app);
    await agent2.post("/auth/request-otp").send({ email: emailFor(4) });
    const res2 = await agent2
      .post("/auth/verify-otp")
      .send({ email: emailFor(4), otp: MASTER_OTP, name: "Wants Same Mobile", mobile: "9876500001" });
    expect(res2.status).toBe(409);
  });

  it("rejects OTP verification with an invalid code", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/request-otp").send({ email: emailFor(5) });
    const res = await agent.post("/auth/verify-otp").send({ email: emailFor(5), otp: "000000", name: "X" });
    expect(res.status).toBe(400);
  });
});

describe("auth: password signup/login", () => {
  const basePassword = { password: "correct-horse-1", confirmPassword: "correct-horse-1" };

  it("creates an account with email+password and no mobile", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Pw User", email: emailFor(10), roles: ["shipper"], ...basePassword });
    expect(res.status).toBe(201);
    expect(res.body.user.mobile).toBeUndefined();
    expect(res.body.user.hasPassword).toBe(true);
  });

  it("rejects a second signup with the same email", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ name: "First", email: emailFor(11), ...basePassword });
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Second", email: emailFor(11), ...basePassword });
    expect(res.status).toBe(409);
    expect(res.body.msg).toMatch(/email/i);
  });

  it("rejects a second signup with the same mobile even if the email differs", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ name: "First", email: emailFor(12), mobile: "9876500002", ...basePassword });
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Second", email: emailFor(13), mobile: "9876500002", ...basePassword });
    expect(res.status).toBe(409);
    expect(res.body.msg).toMatch(/mobile/i);
  });

  it("does not let a fresh signup collide with an existing mobile-less account", async () => {
    // Regression guard for the old `$or:[{mobile},{email}]` bug, where an
    // absent mobile matched every other mobile-less account.
    await request(app)
      .post("/auth/signup")
      .send({ name: "No Mobile", email: emailFor(14), ...basePassword });
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Also No Mobile", email: emailFor(15), ...basePassword });
    expect(res.status).toBe(201);
  });

  it("logs in with email + password", async () => {
    // Sets the password via the OTP-signup + set-password path instead of
    // POST /auth/signup — both are authLimiter-gated, so routing setup
    // through the one this test isn't actually exercising keeps this whole
    // file well under the per-IP 20-req/15min cap that /auth/signup,
    // /login-password, /forgot-password, and /reset-password all share.
    const { agent } = await signupUser(app, { email: emailFor(16), name: "Login Test" });
    await agent.put("/auth/set-password").send({ newPassword: "correct-horse-1", confirmPassword: "correct-horse-1" });

    const res = await request(app).post("/auth/login-password").send({ email: emailFor(16), password: "correct-horse-1" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(emailFor(16));
  });

  it("rejects the wrong password with a generic message", async () => {
    const { agent } = await signupUser(app, { email: emailFor(17), name: "Wrong Pw" });
    await agent.put("/auth/set-password").send({ newPassword: "correct-horse-1", confirmPassword: "correct-horse-1" });

    const res = await request(app).post("/auth/login-password").send({ email: emailFor(17), password: "not-the-password" });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/incorrect email or password/i);
  });

  it("no longer accepts a mobile number as the login identifier", async () => {
    // The old dual-identifier endpoint took `identifier`; the current one
    // only recognizes `email` — sending a mobile-shaped string fails format
    // validation before any account lookup even happens, so this doesn't
    // need a real account at all.
    const res = await request(app)
      .post("/auth/login-password")
      .send({ email: "9876500003", password: "correct-horse-1" });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/valid email/i);
  });
});

describe("auth: forgot password / reset password", () => {
  const basePassword = { password: "original-pw-1", confirmPassword: "original-pw-1" };

  it("does the full forgot -> reset -> login-with-new-password round trip, invalidating the old session", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/request-otp").send({ email: emailFor(20) });
    const signupRes = await agent.post("/auth/verify-otp").send({ email: emailFor(20), otp: MASTER_OTP, name: "Reset Me" });
    const oldCookie = signupRes.headers["set-cookie"];
    await agent.put("/auth/set-password").send({ newPassword: basePassword.password, confirmPassword: basePassword.confirmPassword });

    const logSpy = jest.spyOn(console, "log");
    const forgotRes = await request(app).post("/auth/forgot-password").send({ email: emailFor(20) });
    expect(forgotRes.status).toBe(200);

    const emailCall = await waitForLogContaining(logSpy, [emailFor(20), "token="]);
    expect(emailCall).toBeTruthy();
    const tokenMatch = String(emailCall[0]).match(/token=([a-f0-9]+)/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch[1];
    logSpy.mockRestore();

    const resetRes = await request(app)
      .post("/auth/reset-password")
      .send({ token, password: "brand-new-pw-1", confirmPassword: "brand-new-pw-1" });
    expect(resetRes.status).toBe(200);

    // Old password no longer works.
    const oldLoginRes = await request(app).post("/auth/login-password").send({ email: emailFor(20), password: "original-pw-1" });
    expect(oldLoginRes.status).toBe(400);

    // New password works.
    const newLoginRes = await request(app).post("/auth/login-password").send({ email: emailFor(20), password: "brand-new-pw-1" });
    expect(newLoginRes.status).toBe(200);

    // The pre-reset session cookie is stale (resetPassword bumps sessionVersion).
    const staleRes = await request(app).get("/auth/profile").set("Cookie", oldCookie);
    expect(staleRes.status).toBe(401);
  });

  it("responds the same way whether or not the email has an account (no enumeration)", async () => {
    const known = await request(app).post("/auth/forgot-password").send({ email: emailFor(21) });
    const unknown = await request(app).post("/auth/forgot-password").send({ email: "nobody-here@example.test" });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.msg).toBe(unknown.body.msg);
  });

  it("rejects an invalid or already-used reset token", async () => {
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "not-a-real-token", password: "whatever-123", confirmPassword: "whatever-123" });
    expect(res.status).toBe(400);
  });
});

describe("auth: profile-driven mobile edits", () => {
  it("lets a user add, change, and clear their optional mobile number", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(30), name: "Mobile Editor" });

    const addRes = await agent.put("/auth/profile").send({ mobile: "9876500010" });
    expect(addRes.status).toBe(200);
    expect(addRes.body.user.mobile).toBe("9876500010");

    const clearRes = await agent.put("/auth/profile").send({ mobile: "" });
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.user.mobile).toBeUndefined();

    const persisted = await User.findById(user._id);
    expect(persisted.mobile).toBeUndefined();
  });

  it("rejects updating to a mobile number already used by someone else", async () => {
    const { agent: ownerAgent } = await signupUser(app, { email: emailFor(31), name: "Owner" });
    await ownerAgent.put("/auth/profile").send({ mobile: "9876500020" });

    const { agent: otherAgent } = await signupUser(app, { email: emailFor(32), name: "Other" });
    const res = await otherAgent.put("/auth/profile").send({ mobile: "9876500020" });
    expect(res.status).toBe(409);
  });

  it("cannot change email through the profile endpoint", async () => {
    // email isn't in updateProfileValidation's schema at all (same
    // treatment mobile used to get) — sending it is rejected outright
    // rather than silently accepted and ignored.
    const { agent, user } = await signupUser(app, { email: emailFor(33), name: "Immutable Email" });
    const res = await agent.put("/auth/profile").send({ email: "someone-else@example.test" });
    expect(res.status).toBe(400);
    const persisted = await User.findById(user._id);
    expect(persisted.email).toBe(emailFor(33));
  });
});

describe("auth: setPassword on an OTP-created account", () => {
  it("lets an OTP-only user set a password, then log in with it", async () => {
    const { agent } = await signupUser(app, { email: emailFor(40), name: "Sets Password" });

    const setRes = await agent
      .put("/auth/set-password")
      .send({ newPassword: "new-password-1", confirmPassword: "new-password-1" });
    expect(setRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/auth/login-password")
      .send({ email: emailFor(40), password: "new-password-1" });
    expect(loginRes.status).toBe(200);
  });
});
