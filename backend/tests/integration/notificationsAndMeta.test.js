const request = require("supertest");
const app = require("../../app");
const Notification = require("../../models/notificationModel");
const PushSubscription = require("../../models/pushSubscriptionModel");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `notimeta${seed}@example.test`;

const newActors = async (seed) => {
  const { agent: transporterAgent, user: transporter } = await signupUser(app, {
    email: emailFor(seed * 10 + 1),
    name: "T",
    roles: ["transporter"],
  });
  const { agent: shipperAgent, user: shipper } = await signupUser(app, {
    email: emailFor(seed * 10 + 2),
    name: "S",
    roles: ["shipper"],
  });
  return { transporterAgent, transporter, shipperAgent, shipper };
};

// Triggers a real "new_booking_request" notification for the transporter by
// posting a booking through the actual API (see bookingController.js —
// notify(trip.transporter, "new_booking_request", ...) fires right after a
// successful POST /bookings), rather than reaching into the DB.
const triggerNotificationForTransporter = async ({ transporterAgent, shipperAgent }) => {
  const trip = await postTestTrip(transporterAgent);
  const bookingRes = await shipperAgent
    .post("/bookings")
    .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
  if (!bookingRes.body.success) {
    throw new Error(`triggerNotificationForTransporter: booking failed: ${bookingRes.body.msg}`);
  }
  return bookingRes.body.booking;
};

const samplePushSubscription = (seed) => ({
  endpoint: `https://push.example.test/subscription/${seed}`,
  keys: {
    p256dh: "p256dh-key-value-1234567890",
    auth: "auth-key-value-abcdef",
  },
});

beforeEach(async () => {
  await disableVerificationGate();
});

describe("meta: GET /meta/cities", () => {
  it("returns matching cities for a query, with no auth cookie at all", async () => {
    const res = await request(app).get("/meta/cities").query({ q: "Pun" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.cities)).toBe(true);
    expect(res.body.cities.length).toBeGreaterThan(0);
    expect(res.body.cities.every((c) => typeof c === "string")).toBe(true);
    expect(res.body.cities.some((c) => c.toLowerCase().startsWith("pun"))).toBe(true);
  });

  it("returns an empty list for an empty/missing query", async () => {
    const res = await request(app).get("/meta/cities");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cities).toEqual([]);
  });
});

describe("meta: GET /meta/vapid-public-key", () => {
  it("returns 200 with no auth, and never 500s even if VAPID isn't configured", async () => {
    const res = await request(app).get("/meta/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("publicKey");
    expect(res.body.publicKey === null || typeof res.body.publicKey === "string").toBe(true);
  });
});

describe("notifications: GET /notifications/categories", () => {
  it("returns 200 with the category label map when authed", async () => {
    const { agent } = await signupUser(app, { email: emailFor(1), name: "Cat User" });
    const res = await agent.get("/notifications/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.categories).toBeTruthy();
    expect(typeof res.body.categories).toBe("object");
    // Sanity-check a couple of the known category keys are present, matching
    // config/notificationCategories.js's CATEGORY_LABELS.
    expect(res.body.categories.bookings).toBe("Booking updates");
    expect(res.body.categories.chat).toBe("Chat messages");
    expect(Object.keys(res.body.categories).length).toBeGreaterThan(0);
  });

  it("401s with no auth cookie", async () => {
    const res = await request(app).get("/notifications/categories");
    expect(res.status).toBe(401);
  });

  it("401s with an invalid/garbage auth cookie", async () => {
    const res = await request(app).get("/notifications/categories").set("Cookie", "token=not-a-real-jwt");
    expect(res.status).toBe(401);
  });
});

describe("notifications: full lifecycle via a real triggered notification", () => {
  it("lists a real notification triggered by a booking request, marks it read, and reflects that on re-fetch", async () => {
    const actors = await newActors(1);
    const booking = await triggerNotificationForTransporter(actors);

    const listRes = await actors.transporterAgent.get("/notifications/me");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.notifications)).toBe(true);
    expect(listRes.body.notifications.length).toBeGreaterThan(0);

    const notif = listRes.body.notifications.find((n) => n.type === "new_booking_request");
    expect(notif).toBeTruthy();
    expect(notif.payload.bookingId).toBe(String(booking._id));
    expect(notif.readAt).toBeFalsy();

    const readRes = await actors.transporterAgent.put(`/notifications/${notif._id}/read`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.success).toBe(true);
    expect(readRes.body.notification.readAt).toBeTruthy();

    // Confirm via a second GET, not just the mutation's own response body.
    const listAfter = await actors.transporterAgent.get("/notifications/me");
    const notifAfter = listAfter.body.notifications.find((n) => n._id === notif._id);
    expect(notifAfter.readAt).toBeTruthy();

    // unreadOnly filter should now exclude it.
    const unreadRes = await actors.transporterAgent.get("/notifications/me").query({ unreadOnly: "true" });
    expect(unreadRes.body.notifications.find((n) => n._id === notif._id)).toBeUndefined();
  });

  it("marks all notifications read via PUT /notifications/read-all", async () => {
    const actors = await newActors(2);
    // Trigger two separate notifications (two separate trips/bookings) for the same transporter.
    await triggerNotificationForTransporter(actors);
    await triggerNotificationForTransporter(actors);

    const before = await actors.transporterAgent.get("/notifications/me");
    expect(before.body.notifications.length).toBeGreaterThanOrEqual(2);
    expect(before.body.notifications.every((n) => !n.readAt)).toBe(true);

    const markAllRes = await actors.transporterAgent.put("/notifications/read-all");
    expect(markAllRes.status).toBe(200);
    expect(markAllRes.body.success).toBe(true);

    const after = await actors.transporterAgent.get("/notifications/me");
    expect(after.body.notifications.length).toBeGreaterThanOrEqual(2);
    expect(after.body.notifications.every((n) => n.readAt)).toBe(true);
  });

  it("404s marking a nonexistent notification id as read", async () => {
    const { agent } = await signupUser(app, { email: emailFor(30), name: "Lonely User" });
    const fakeId = "64b000000000000000000000";
    const res = await agent.put(`/notifications/${fakeId}/read`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("does not let another user mark someone else's notification as read", async () => {
    const actors = await newActors(3);
    await triggerNotificationForTransporter(actors);

    const listRes = await actors.transporterAgent.get("/notifications/me");
    const notif = listRes.body.notifications[0];
    expect(notif).toBeTruthy();

    // The shipper (a different, real user) tries to mark the transporter's notification read.
    const strangerRes = await actors.shipperAgent.put(`/notifications/${notif._id}/read`);
    expect(strangerRes.status).toBe(404);
    expect(strangerRes.body.success).toBe(false);

    // Confirm it's genuinely untouched, not silently accepted.
    const stillUnread = await Notification.findById(notif._id);
    expect(stillUnread.readAt).toBeFalsy();
  });

  it("401s GET /notifications/me and PUT /notifications/read-all with no auth", async () => {
    const meRes = await request(app).get("/notifications/me");
    expect(meRes.status).toBe(401);

    const readAllRes = await request(app).put("/notifications/read-all");
    expect(readAllRes.status).toBe(401);

    const fakeId = "64b000000000000000000000";
    const readRes = await request(app).put(`/notifications/${fakeId}/read`);
    expect(readRes.status).toBe(401);
  });
});

describe("push: POST /push/subscribe and /push/unsubscribe", () => {
  it("subscribes with a valid Web Push subscription object", async () => {
    const { agent, user } = await signupUser(app, { email: emailFor(40), name: "Push User" });
    const sub = samplePushSubscription(40);

    const res = await agent.post("/push/subscribe").send(sub);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stored = await PushSubscription.findOne({ endpoint: sub.endpoint });
    expect(stored).toBeTruthy();
    expect(String(stored.user)).toBe(String(user._id));
    expect(stored.keys.p256dh).toBe(sub.keys.p256dh);
  });

  it("re-subscribing the same endpoint (upsert path) still returns 200, not a duplicate-key error", async () => {
    const { agent } = await signupUser(app, { email: emailFor(41), name: "Push User 2" });
    const sub = samplePushSubscription(41);

    const first = await agent.post("/push/subscribe").send(sub);
    expect(first.status).toBe(200);

    const second = await agent.post("/push/subscribe").send(sub);
    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);

    // Still exactly one row for this endpoint — the upsert updated it, not duplicated it.
    const count = await PushSubscription.countDocuments({ endpoint: sub.endpoint });
    expect(count).toBe(1);
  });

  it("reassigns an existing endpoint to a different user who subscribes with it (shared-device case)", async () => {
    const { agent: agentA, user: userA } = await signupUser(app, { email: emailFor(42), name: "Device User A" });
    const { agent: agentB, user: userB } = await signupUser(app, { email: emailFor(43), name: "Device User B" });
    const sub = samplePushSubscription(42);

    await agentA.post("/push/subscribe").send(sub);
    const secondSubscribe = await agentB.post("/push/subscribe").send(sub);
    expect(secondSubscribe.status).toBe(200);

    const stored = await PushSubscription.findOne({ endpoint: sub.endpoint });
    expect(String(stored.user)).toBe(String(userB._id));
    expect(String(stored.user)).not.toBe(String(userA._id));
  });

  it("400s subscribe with a missing keys object", async () => {
    const { agent } = await signupUser(app, { email: emailFor(44), name: "Bad Push User" });
    const res = await agent.post("/push/subscribe").send({ endpoint: "https://push.example.test/bad" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400s subscribe with a non-URI endpoint", async () => {
    const { agent } = await signupUser(app, { email: emailFor(45), name: "Bad Endpoint User" });
    const res = await agent.post("/push/subscribe").send({
      endpoint: "not-a-url",
      keys: { p256dh: "x", auth: "y" },
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("unsubscribes successfully, removing the stored subscription", async () => {
    const { agent } = await signupUser(app, { email: emailFor(46), name: "Unsub User" });
    const sub = samplePushSubscription(46);
    await agent.post("/push/subscribe").send(sub);

    const res = await agent.post("/push/unsubscribe").send({ endpoint: sub.endpoint });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stored = await PushSubscription.findOne({ endpoint: sub.endpoint });
    expect(stored).toBeNull();
  });

  it("401s subscribe/unsubscribe with no auth", async () => {
    const sub = samplePushSubscription(47);
    const subRes = await request(app).post("/push/subscribe").send(sub);
    expect(subRes.status).toBe(401);

    const unsubRes = await request(app).post("/push/unsubscribe").send({ endpoint: sub.endpoint });
    expect(unsubRes.status).toBe(401);
  });
});
