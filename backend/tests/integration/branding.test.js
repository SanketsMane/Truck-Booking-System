const request = require("supertest");
const app = require("../../app");
const UploadedFile = require("../../models/uploadedFileModel");
const { getBrandName } = require("../../utils/brandingCache");
const { signupUser, makeAdmin } = require("../helpers");

const emailFor = (seed) => `branding${seed}@example.test`;

// A minimal-but-real PNG, same bytes tests/helpers.js's uploadTestFile uses.
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const uploadPublicPng = async (agent) => {
  const res = await agent
    .post("/files")
    .field("isPublic", "true")
    .attach("file", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });
  if (!res.body.success) throw new Error(`upload failed: ${res.body.msg}`);
  return res.body.file;
};

describe("platform branding", () => {
  it("GET /meta/branding — public, no auth, returns defaults before anything is configured", async () => {
    const res = await request(app).get("/meta/branding");
    expect(res.status).toBe(200);
    expect(res.body.branding).toEqual({
      platformName: "Truckgee",
      logoUrl: "",
      faviconUrl: "",
      contactEmail: "",
      contactMobile: "",
    });
  });

  it("PUT /admin/settings/branding — 403 for a non-full-scope admin", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(2), name: "Admin" });
    await makeAdmin(user, "support");

    const res = await agent.put("/admin/settings/branding").send({ platformName: "Acme Freight" });
    expect(res.status).toBe(403);
  });

  it("PUT /admin/settings/branding — validates platformName, contactEmail, contactMobile", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(3), name: "Admin" });
    await makeAdmin(user, "full");

    const noName = await agent.put("/admin/settings/branding").send({ platformName: "" });
    expect(noName.status).toBe(400);

    const badEmail = await agent
      .put("/admin/settings/branding")
      .send({ platformName: "Acme Freight", contactEmail: "not-an-email" });
    expect(badEmail.status).toBe(400);

    const badMobile = await agent
      .put("/admin/settings/branding")
      .send({ platformName: "Acme Freight", contactMobile: "12345" });
    expect(badMobile.status).toBe(400);
  });

  it("full-scope admin updates branding, and GET /meta/branding reflects it immediately (proves the cache refresh)", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(4), name: "Admin" });
    await makeAdmin(user, "full");

    const res = await agent.put("/admin/settings/branding").send({
      platformName: "Acme Freight",
      contactEmail: "hello@acmefreight.test",
      contactMobile: "9876543210",
    });
    expect(res.status).toBe(200);
    expect(res.body.settings.platformName).toBe("Acme Freight");

    const publicRead = await request(app).get("/meta/branding");
    expect(publicRead.body.branding).toEqual({
      platformName: "Acme Freight",
      logoUrl: "",
      faviconUrl: "",
      contactEmail: "hello@acmefreight.test",
      contactMobile: "9876543210",
    });

    // GET /meta/branding reads PlatformSetting directly, not the in-memory
    // cache — check the cache itself so this actually proves
    // updateBranding's refreshBrandingCache() call ran, not just that the
    // DB write persisted (which the assertion above already covers).
    expect(getBrandName()).toBe("Acme Freight");
  });

  it("uploading and saving a logo marks the file public, and replacing it reclaims the superseded file", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(5), name: "Admin" });
    await makeAdmin(user, "full");

    const firstLogo = await uploadPublicPng(agent);
    const saveFirst = await agent.put("/admin/settings/branding").send({
      platformName: "Acme Freight",
      logoUrl: firstLogo.url,
    });
    expect(saveFirst.status).toBe(200);
    expect(saveFirst.body.settings.logoUrl).toBe(firstLogo.url);

    const secondLogo = await uploadPublicPng(agent);
    const saveSecond = await agent.put("/admin/settings/branding").send({
      platformName: "Acme Freight",
      logoUrl: secondLogo.url,
    });
    expect(saveSecond.status).toBe(200);
    expect(saveSecond.body.settings.logoUrl).toBe(secondLogo.url);

    const oldFile = await UploadedFile.findById(firstLogo.id);
    expect(oldFile).toBeNull();

    const newFile = await UploadedFile.findById(secondLogo.id);
    expect(newFile).not.toBeNull();
    expect(newFile.isPublic).toBe(true);
  });

  it("GET /files/:id sets long-lived caching headers for a public branding asset", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(6), name: "Admin" });
    await makeAdmin(user, "full");

    const logo = await uploadPublicPng(agent);
    await agent.put("/admin/settings/branding").send({ platformName: "Acme Freight", logoUrl: logo.url });

    const fileRes = await request(app).get(logo.url);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });
});
