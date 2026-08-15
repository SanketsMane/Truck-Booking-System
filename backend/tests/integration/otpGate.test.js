const request = require("supertest");
const app = require("../../app");

// Exercises the real POST /auth/request-otp route end to end (not just the
// pure isOtpBlocked() decision, which tests/unit/notificationGuard.test.js
// already covers) — this is the path that actually locks real users out in
// production if it regresses. Provider stays at the default "console" for
// every case here (never actually configured), so no real SMTP/network call
// is ever attempted; the gate itself is what's under test.
const withNodeEnv = async (value, fn) => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    await fn();
  } finally {
    process.env.NODE_ENV = original;
  }
};

const withSeedAdminEmail = async (value, fn) => {
  const original = process.env.SEED_ADMIN_EMAIL;
  process.env.SEED_ADMIN_EMAIL = value;
  try {
    await fn();
  } finally {
    if (original === undefined) delete process.env.SEED_ADMIN_EMAIL;
    else process.env.SEED_ADMIN_EMAIL = original;
  }
};

describe("POST /auth/request-otp — production notification gate", () => {
  it("blocks a regular user in production with no email provider configured", async () => {
    await withNodeEnv("production", async () => {
      await withSeedAdminEmail("admin@example.test", async () => {
        const res = await request(app).post("/auth/request-otp").send({ email: "shipper@example.test" });
        expect(res.status).toBe(503);
        expect(res.body.success).toBe(false);
      });
    });
  });

  it("still lets the seed admin request an OTP, even unconfigured", async () => {
    await withNodeEnv("production", async () => {
      await withSeedAdminEmail("admin@example.test", async () => {
        const res = await request(app).post("/auth/request-otp").send({ email: "admin@example.test" });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  it("is unaffected outside production, regardless of provider config", async () => {
    const res = await request(app).post("/auth/request-otp").send({ email: "shipper2@example.test" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
