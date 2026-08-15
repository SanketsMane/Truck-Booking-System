const { isOtpBlocked } = require("../../utils/notificationGuard");

describe("isOtpBlocked", () => {
  it("never blocks outside production", () => {
    expect(
      isOtpBlocked({
        email: "shipper@example.com",
        nodeEnv: "development",
        seedAdminEmail: "admin@example.com",
        emailProviderConfigured: false,
      })
    ).toBe(false);
  });

  it("blocks a regular user in production with no real email provider configured", () => {
    expect(
      isOtpBlocked({
        email: "shipper@example.com",
        nodeEnv: "production",
        seedAdminEmail: "admin@example.com",
        emailProviderConfigured: false,
      })
    ).toBe(true);
  });

  it("never blocks the seed admin, even unconfigured — their only way in is this OTP", () => {
    expect(
      isOtpBlocked({
        email: "admin@example.com",
        nodeEnv: "production",
        seedAdminEmail: "admin@example.com",
        emailProviderConfigured: false,
      })
    ).toBe(false);
  });

  it("does not block anyone once a real email provider is configured", () => {
    expect(
      isOtpBlocked({
        email: "shipper@example.com",
        nodeEnv: "production",
        seedAdminEmail: "admin@example.com",
        emailProviderConfigured: true,
      })
    ).toBe(false);
  });

  it("blocks a regular user even when SEED_ADMIN_EMAIL was never set", () => {
    expect(
      isOtpBlocked({
        email: "shipper@example.com",
        nodeEnv: "production",
        seedAdminEmail: "",
        emailProviderConfigured: false,
      })
    ).toBe(true);
  });
});
