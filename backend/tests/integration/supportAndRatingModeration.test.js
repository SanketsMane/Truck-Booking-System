const request = require("supertest");
const app = require("../../app");
const Rating = require("../../models/ratingModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip } = require("../helpers");

// Two independent email namespaces so seeds never need to be coordinated
// across the two describe blocks below — collections are wiped between
// individual `it()`s (see tests/setup.js), so uniqueness only has to hold
// *within* a single test, not across the whole file.
const emailFor = (seed) => `str-user-${seed}@example.test`;

beforeEach(async () => {
  await disableVerificationGate();
});

// Drives a booking all the way to "completed" (request -> accept -> pay ->
// pickup -> drop, mirroring happyPath.test.js's lifecycle but skipping the
// KYC submission/review steps since the verification gate is disabled
// above) and then has the shipper rate the transporter, returning what a
// flag/moderate test needs to work with a real, submittable rating.
const buildCompletedRating = async (seed) => {
  const { agent: transporterAgent, user: transporter } = await signupUser(app, {
    email: `str-transporter-${seed}@example.test`,
    name: "Transporter",
    roles: ["transporter"],
  });
  const { agent: shipperAgent, user: shipper } = await signupUser(app, {
    email: `str-shipper-${seed}@example.test`,
    name: "Shipper",
    roles: ["shipper"],
  });

  const trip = await postTestTrip(transporterAgent);

  const bookingRes = await shipperAgent
    .post("/bookings")
    .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
  const bookingId = bookingRes.body.booking._id;
  const price = bookingRes.body.booking.priceEstimate;

  await transporterAgent.put(`/bookings/${bookingId}/accept`);

  // Fund the shipper's wallet via a temporary finance-admin grant on this
  // same test user (same trick bookingEdgeCases.test.js uses) rather than
  // standing up a whole separate admin actor just to seed money.
  shipper.isAdmin = true;
  shipper.adminScope = "finance";
  await shipper.save();
  await shipperAgent.post(`/admin/wallets/${shipper._id}/adjust`).send({
    amount: price,
    direction: "credit",
    reason: "test funding",
  });
  shipper.isAdmin = false;
  shipper.adminScope = undefined;
  await shipper.save();

  await shipperAgent.post(`/bookings/${bookingId}/pay/wallet`);
  await shipperAgent.put(`/bookings/${bookingId}/confirm-pickup`);
  await transporterAgent.put(`/bookings/${bookingId}/confirm-drop`);

  const ratingRes = await shipperAgent
    .post("/ratings")
    .send({ bookingId, stars: 5, reviewText: "Great service" });
  if (!ratingRes.body.success) {
    throw new Error(`buildCompletedRating(${seed}): rating submission failed: ${ratingRes.body.msg}`);
  }

  return { transporterAgent, transporter, shipperAgent, shipper, bookingId, rating: ratingRes.body.rating };
};

describe("support requests", () => {
  it("creates a support request and lists it only for the caller", async () => {
    const { agent: userA } = await signupUser(app, { email: emailFor(1), name: "A" });
    const { agent: userB } = await signupUser(app, { email: emailFor(2), name: "B" });

    const createRes = await userA.post("/support").send({ subject: "Payment issue", message: "My wallet wasn't credited" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.request.subject).toBe("Payment issue");
    expect(createRes.body.request.message).toBe("My wallet wasn't credited");
    expect(createRes.body.request.status).toBe("open");

    const otherCreate = await userB.post("/support").send({ subject: "Other user's issue", message: "Unrelated" });
    expect(otherCreate.status).toBe(201);

    const listRes = await userA.get("/support/me");
    expect(listRes.status).toBe(200);
    expect(listRes.body.requests).toHaveLength(1);
    expect(listRes.body.requests[0].subject).toBe("Payment issue");
    expect(listRes.body.requests[0]._id).toBe(createRes.body.request._id);
  });

  it("rejects a non-admin from listing all support requests or resolving one", async () => {
    const { agent: userA } = await signupUser(app, { email: emailFor(3), name: "A" });
    const createRes = await userA.post("/support").send({ subject: "x", message: "y" });
    const requestId = createRes.body.request._id;

    const listRes = await userA.get("/support");
    expect(listRes.status).toBe(403);

    const resolveRes = await userA.put(`/support/${requestId}/resolve`);
    expect(resolveRes.status).toBe(403);
  });

  it("lets a support-scoped admin list all requests and resolve one", async () => {
    const { agent: userA } = await signupUser(app, { email: emailFor(4), name: "A" });
    const createRes = await userA.post("/support").send({ subject: "Booking dispute", message: "Driver never showed" });
    const requestId = createRes.body.request._id;

    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(5), name: "Admin" });
    await makeAdmin(adminUser, "support");

    const listRes = await adminAgent.get("/support");
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.some((r) => r._id === requestId)).toBe(true);
    expect(listRes.body.total).toBeGreaterThanOrEqual(1);

    const resolveRes = await adminAgent.put(`/support/${requestId}/resolve`);
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.request._id).toBe(requestId);
    expect(resolveRes.body.request.status).toBe("resolved");

    const meAfter = await userA.get("/support/me");
    expect(meAfter.body.requests[0].status).toBe("resolved");
  });

  it("blocks a finance-scoped admin from resolving a support request (requireAdminScope is exact-match, not hierarchical)", async () => {
    const { agent: userA } = await signupUser(app, { email: emailFor(6), name: "A" });
    const createRes = await userA.post("/support").send({ subject: "x", message: "y" });
    const requestId = createRes.body.request._id;

    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(7), name: "Admin" });
    await makeAdmin(adminUser, "finance");

    const resolveRes = await adminAgent.put(`/support/${requestId}/resolve`);
    expect(resolveRes.status).toBe(403);
    expect(resolveRes.body.msg).toMatch(/requires additional admin permissions/);
  });

  it("lets a full-scope admin resolve a support request, since 'full' bypasses every scope check", async () => {
    const { agent: userA } = await signupUser(app, { email: emailFor(8), name: "A" });
    const createRes = await userA.post("/support").send({ subject: "x", message: "y" });
    const requestId = createRes.body.request._id;

    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(9), name: "Admin" });
    await makeAdmin(adminUser, "full");

    const resolveRes = await adminAgent.put(`/support/${requestId}/resolve`);
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.request.status).toBe("resolved");
  });
});

describe("rating moderation", () => {
  it("lets any authenticated user flag a rating, and an admin sees it in the flagged queue", async () => {
    const { rating } = await buildCompletedRating("flag1");
    const { agent: bystanderAgent } = await signupUser(app, { email: emailFor(20), name: "Bystander" });

    const flagRes = await bystanderAgent.put(`/ratings/${rating._id}/flag`);
    expect(flagRes.status).toBe(200);
    expect(flagRes.body.rating._id).toBe(rating._id);
    expect(flagRes.body.rating.flagged).toBe(true);

    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(21), name: "Admin" });
    await makeAdmin(adminUser, "support");

    const flaggedRes = await adminAgent.get("/ratings/flagged");
    expect(flaggedRes.status).toBe(200);
    expect(flaggedRes.body.items.some((r) => r._id === rating._id)).toBe(true);
    expect(flaggedRes.body.total).toBeGreaterThanOrEqual(1);
  });

  it("lets a support-scoped admin hide a flagged rating, removing it from the public listing", async () => {
    const { rating, transporter } = await buildCompletedRating("hide1");

    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(22), name: "Admin" });
    await makeAdmin(adminUser, "support");
    await adminAgent.put(`/ratings/${rating._id}/flag`);

    const moderateRes = await adminAgent.put(`/ratings/${rating._id}/moderate`).send({ action: "hide", reason: "abusive language" });
    expect(moderateRes.status).toBe(200);
    expect(moderateRes.body.msg).toMatch(/hidden/);

    const persisted = await Rating.findById(rating._id);
    expect(persisted.moderated).toBe(true);
    expect(persisted.flagged).toBe(true); // hide doesn't clear the flag, just marks it moderated

    const publicListing = await request(app).get(`/ratings/user/${transporter._id}`);
    expect(publicListing.body.ratings.some((r) => r._id === rating._id)).toBe(false);
  });

  it("lets a support-scoped admin remove (delete) a flagged rating outright", async () => {
    const { rating } = await buildCompletedRating("remove1");

    const { agent: adminAgent, user: adminUser } = await signupUser(app, { email: emailFor(23), name: "Admin" });
    await makeAdmin(adminUser, "support");

    const moderateRes = await adminAgent.put(`/ratings/${rating._id}/moderate`).send({ action: "remove", reason: "fake review" });
    expect(moderateRes.status).toBe(200);
    expect(moderateRes.body.msg).toMatch(/removed/);

    const persisted = await Rating.findById(rating._id);
    expect(persisted).toBeNull();
  });

  it("rejects a non-admin from the flagged queue and from moderating a rating", async () => {
    const { rating } = await buildCompletedRating("forbid1");
    const { agent: strangerAgent } = await signupUser(app, { email: emailFor(24), name: "Stranger" });

    const flaggedRes = await strangerAgent.get("/ratings/flagged");
    expect(flaggedRes.status).toBe(403);

    const moderateRes = await strangerAgent.put(`/ratings/${rating._id}/moderate`).send({ action: "hide" });
    expect(moderateRes.status).toBe(403);

    const persisted = await Rating.findById(rating._id);
    expect(persisted.moderated).toBe(false); // untouched by the rejected attempt
  });
});
