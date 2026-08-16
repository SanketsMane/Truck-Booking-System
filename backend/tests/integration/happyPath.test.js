const request = require("supertest");
const app = require("../../app");
const { signupUser, makeAdmin, submitVerification } = require("../helpers");

// SRS §8.3's mandated end-to-end path: signup -> verification -> trip
// posting -> search -> booking -> accept -> pickup -> drop -> rate.
// One continuous test asserting the state transition at each step, rather
// than several independent tests re-establishing the same setup — the
// whole point is that each step's *output* is valid input for the next.
it("walks the full shipper/transporter booking lifecycle", async () => {
  const { agent: transporterAgent, user: transporter } = await signupUser(app, {
    email: "transporter@happypath.test",
    name: "Test Transporter",
    roles: ["transporter"],
  });
  const { agent: shipperAgent } = await signupUser(app, {
    email: "shipper@happypath.test",
    name: "Test Shipper",
    roles: ["shipper"],
  });
  const { agent: adminAgent, user: adminUser } = await signupUser(app, {
    email: "admin@happypath.test",
    name: "Test Admin",
  });
  await makeAdmin(adminUser, "full");

  // --- Truck registration ---
  const truckRes = await transporterAgent.post("/trucks").send({
    regNumber: "MH12AB1234",
    truckType: "Open Body",
    bodyType: "Flatbed",
    totalCapacity: 20,
  });
  expect(truckRes.status).toBe(201);
  const truckId = truckRes.body.truck._id;

  // --- KYC submission (both parties) ---
  const transporterVerificationId = await submitVerification(transporterAgent, "transporter");
  const shipperVerificationId = await submitVerification(shipperAgent, "shipper");

  // --- Admin review: truck + both KYC submissions ---
  const truckReview = await adminAgent.put(`/trucks/${truckId}/review`).send({ status: "verified" });
  expect(truckReview.status).toBe(200);
  expect(truckReview.body.truck.status).toBe("verified");

  const transporterKycReview = await adminAgent
    .put(`/verification/${transporterVerificationId}/review`)
    .send({ status: "verified" });
  expect(transporterKycReview.body.verification.status).toBe("verified");

  const shipperKycReview = await adminAgent
    .put(`/verification/${shipperVerificationId}/review`)
    .send({ status: "verified" });
  expect(shipperKycReview.body.verification.status).toBe("verified");

  // --- Trip posted only once truck + transporter KYC are both verified (SRS-03.3) ---
  const departureAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const tripRes = await transporterAgent.post("/trips").send({
    truckId,
    fromCity: "Pune",
    toCity: "Nashik",
    departureAt,
    pickupPoint: { address: "Pune warehouse" },
    dropPoint: { address: "Nashik yard" },
    totalCapacity: 20,
    availableCapacity: 20,
    pricePerTon: 1000,
  });
  expect(tripRes.status).toBe(201);
  expect(tripRes.body.trip.status).toBe("published");
  const tripId = tripRes.body.trip._id;

  // --- Search (exact city match, date-range window per SRS-04.1) ---
  const searchDate = departureAt.slice(0, 10);
  const searchRes = await request(app)
    .get("/trips/search")
    .query({ fromCity: "Pune", toCity: "Nashik", date: searchDate });
  expect(searchRes.status).toBe(200);
  expect(searchRes.body.trips.some((t) => t._id === tripId)).toBe(true);

  // --- Booking request (soft-held, not yet deducted from availableCapacity) ---
  const bookingRes = await shipperAgent.post("/bookings").send({
    tripId,
    capacityRequested: 5,
    goodsDescription: "Packaged cement bags",
  });
  expect(bookingRes.status).toBe(201);
  expect(bookingRes.body.booking.status).toBe("pending");
  const bookingId = bookingRes.body.booking._id;
  const priceEstimate = bookingRes.body.booking.priceEstimate;
  expect(priceEstimate).toBe(5000); // 5 tons * 1000/ton

  // --- Accept (capacity now actually deducted, gated on shipper KYC too) ---
  const acceptRes = await transporterAgent.put(`/bookings/${bookingId}/accept`);
  expect(acceptRes.status).toBe(200);
  expect(acceptRes.body.booking.status).toBe("confirmed");

  const tripAfterAccept = await request(app).get(`/trips/${tripId}`);
  expect(tripAfterAccept.body.trip.availableCapacity).toBe(15);

  // --- Pickup -> ongoing (no payment gate — settlement happens off-app) ---
  const pickupRes = await shipperAgent.put(`/bookings/${bookingId}/confirm-pickup`);
  expect(pickupRes.status).toBe(200);
  expect(pickupRes.body.booking.status).toBe("ongoing");

  // --- Drop -> completed ---
  const dropRes = await transporterAgent.put(`/bookings/${bookingId}/confirm-drop`);
  expect(dropRes.status).toBe(200);
  expect(dropRes.body.booking.status).toBe("completed");

  // --- Both parties rate each other ---
  const shipperRates = await shipperAgent
    .post("/ratings")
    .send({ bookingId, stars: 5, reviewText: "Great service" });
  expect(shipperRates.status).toBe(201);

  const transporterRates = await transporterAgent
    .post("/ratings")
    .send({ bookingId, stars: 4, reviewText: "Paid on time" });
  expect(transporterRates.status).toBe(201);

  const transporterProfile = await transporterAgent.get("/auth/profile");
  // Rated by the shipper (5 stars, one rating so far).
  const freshTransporter = await request(app).get(`/ratings/user/${transporter._id}`);
  expect(freshTransporter.body.ratings).toHaveLength(1);
  expect(freshTransporter.body.ratings[0].stars).toBe(5);
  expect(transporterProfile.status).toBe(200);
});
