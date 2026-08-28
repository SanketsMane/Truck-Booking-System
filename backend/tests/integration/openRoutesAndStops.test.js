const request = require("supertest");
const app = require("../../app");
const Truck = require("../../models/truckModel");
const Trip = require("../../models/tripModel");
const Verification = require("../../models/verificationModel");
const PlatformSetting = require("../../models/platformSettingModel");
const { signupUser, makeAdmin, uniqueRegNumber, disableVerificationGate } = require("../helpers");

const emailFor = (seed) => `openroutes${seed}@example.test`;
const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY_MS).toISOString();

// Real coordinates, so the corridor maths in utils/routeGeo.js is exercised
// against the geography it was written for rather than invented points.
const CITY = {
  mumbai: { lat: 19.076, lng: 72.877 },
  pune: { lat: 18.52, lng: 73.856 },
  nashik: { lat: 19.997, lng: 73.789 },
  nagpur: { lat: 21.146, lng: 79.088 },
};

const point = (address, city) => ({ address, ...(city ? CITY[city] : {}) });

const newTransporter = async (seed) => {
  const { agent, user } = await signupUser(app, {
    email: emailFor(seed),
    name: `Transporter ${seed}`,
    roles: ["transporter"],
  });
  return { agent, user };
};

const newAdmin = async (seed) => {
  const { agent, user } = await signupUser(app, { email: emailFor(seed), name: `Admin ${seed}`, roles: [] });
  await makeAdmin(user, "full");
  return { agent, user };
};

// Registers a truck and takes it all the way through admin review, which is
// what puts it in the owner's usable fleet.
const verifiedTruck = async (agent, adminAgent, overrides = {}) => {
  const res = await agent.post("/trucks").send({
    regNumber: overrides.regNumber || uniqueRegNumber(),
    truckType: "Open Body",
    bodyType: "Flatbed",
    totalCapacity: overrides.totalCapacity ?? 20,
    authorizedToList: true,
  });
  if (!res.body.success) throw new Error(`verifiedTruck failed: ${res.body.msg}`);
  await adminAgent.put(`/trucks/${res.body.truck._id}/review`).send({ status: "verified" });
  return res.body.truck;
};

const grantDriverKyc = (userId) =>
  Verification.findOneAndUpdate(
    { user: userId, type: "transporter" },
    { $set: { status: "verified" } },
    { upsert: true, setDefaultsOnInsert: true }
  );

const postTrip = (agent, truckId, body = {}) =>
  agent.post("/trips").send({
    truckId,
    fromCity: body.fromCity || "Pune",
    toCity: body.toCity || "Nashik",
    departureAt: body.departureAt || inDays(2),
    estimatedArrivalAt: body.estimatedArrivalAt,
    pickupPoint: body.pickupPoint || point("Pune yard"),
    dropPoint: body.dropPoint || point("Nashik yard"),
    stops: body.stops,
    totalCapacity: body.totalCapacity ?? 20,
    availableCapacity: body.availableCapacity ?? 20,
    pricePerTon: body.pricePerTon ?? 1000,
  });

beforeEach(async () => {
  await disableVerificationGate();
});

// ---------------------------------------------------------------------------
// 1. Nothing stands between a transporter with capacity and a shipper who
//    wants it.
// ---------------------------------------------------------------------------

describe("search is no longer boxed into a date window", () => {
  it("finds a trip departing well outside the old ±1 day window", async () => {
    const { agent, user } = await newTransporter(1);
    const { agent: adminAgent } = await newAdmin(2);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);

    // Nine days out — invisible under the old ±1 day rule, which made a
    // perfectly live lane look empty to the shipper.
    const trip = await postTrip(agent, truck._id, { departureAt: inDays(9) });
    expect(trip.status).toBe(201);

    const res = await request(app)
      .get("/trips/search")
      .query({ fromCity: "Pune", toCity: "Nashik", date: new Date().toISOString().slice(0, 10) });

    expect(res.status).toBe(200);
    expect(res.body.trips.map((t) => t._id)).toContain(trip.body.trip._id);
  });

  it("still narrows to a window when the shipper explicitly asks for one", async () => {
    const { agent, user } = await newTransporter(3);
    const { agent: adminAgent } = await newAdmin(4);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);
    const trip = await postTrip(agent, truck._id, { departureAt: inDays(9) });

    const res = await request(app).get("/trips/search").query({
      fromCity: "Pune",
      toCity: "Nashik",
      date: new Date().toISOString().slice(0, 10),
      rangeDays: 1,
    });

    expect(res.body.trips.map((t) => t._id)).not.toContain(trip.body.trip._id);
  });
});

describe("a transporter can run a fleet, not one nominated truck", () => {
  it("posts trips against two different verified trucks on the same account", async () => {
    const { agent, user } = await newTransporter(5);
    const { agent: adminAgent } = await newAdmin(6);
    const truckA = await verifiedTruck(agent, adminAgent);
    const truckB = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);

    const tripA = await postTrip(agent, truckA._id, { fromCity: "Pune", toCity: "Nashik" });
    const tripB = await postTrip(agent, truckB._id, { fromCity: "Mumbai", toCity: "Nagpur" });

    expect(tripA.status).toBe(201);
    expect(tripB.status).toBe(201);
    expect(tripA.body.trip.truck).not.toBe(tripB.body.trip.truck);
  });

  it("still refuses a truck that hasn't been verified, and one that's retired", async () => {
    const { agent, user } = await newTransporter(7);
    await grantDriverKyc(user._id);

    const unverified = await agent.post("/trucks").send({
      regNumber: uniqueRegNumber(),
      truckType: "Open Body",
      totalCapacity: 20,
      authorizedToList: true,
    });
    const pending = await postTrip(agent, unverified.body.truck._id);
    expect(pending.status).toBe(400);
    expect(pending.body.msg).toMatch(/awaiting verification/i);

    await Truck.updateOne(
      { _id: unverified.body.truck._id },
      { $set: { status: "verified", lifecycle: "inactive" } }
    );
    const retired = await postTrip(agent, unverified.body.truck._id);
    expect(retired.status).toBe(400);
    expect(retired.body.msg).toMatch(/retired/i);
  });
});

describe("driver KYC follows the platform's own verification switch", () => {
  it("lets an unverified driver publish while the gate is off", async () => {
    const { agent } = await newTransporter(8);
    const { agent: adminAgent } = await newAdmin(9);
    const truck = await verifiedTruck(agent, adminAgent);
    // Deliberately no grantDriverKyc — this is the case that used to 403
    // unconditionally, even with verification switched off platform-wide.

    const res = await postTrip(agent, truck._id);
    expect(res.status).toBe(201);
  });

  it("blocks an unverified driver once an admin turns the gate on", async () => {
    const { agent } = await newTransporter(10);
    const { agent: adminAgent } = await newAdmin(11);
    const truck = await verifiedTruck(agent, adminAgent);

    const settings = await PlatformSetting.getSettings();
    settings.verificationGateEnabled = true;
    await settings.save();

    const res = await postTrip(agent, truck._id);
    expect(res.status).toBe(403);
    expect(res.body.msg).toMatch(/driver verification/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Multiple stops
// ---------------------------------------------------------------------------

describe("a trip can carry intermediate stops", () => {
  const withStops = (agent, truckId) =>
    postTrip(agent, truckId, {
      fromCity: "Mumbai",
      toCity: "Nagpur",
      pickupPoint: point("Mumbai depot", "mumbai"),
      dropPoint: point("Nagpur yard", "nagpur"),
      stops: [point("Pune warehouse", "pune"), point("Nashik hub", "nashik")],
    });

  it("saves stops in order, with the GeoJSON shadow filled in", async () => {
    const { agent, user } = await newTransporter(12);
    const { agent: adminAgent } = await newAdmin(13);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);

    const res = await withStops(agent, truck._id);
    expect(res.status).toBe(201);

    const trip = await Trip.findById(res.body.trip._id);
    expect(trip.stops.map((s) => s.address)).toEqual(["Pune warehouse", "Nashik hub"]);
    // setLocationGeo has to run per stop or $geoWithin/search can't use them.
    expect(trip.stops[0].location).toMatchObject({ type: "Point", coordinates: [CITY.pune.lng, CITY.pune.lat] });
  });

  it("rejects more stops than the cap allows", async () => {
    const { agent, user } = await newTransporter(14);
    const { agent: adminAgent } = await newAdmin(15);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);

    const res = await postTrip(agent, truck._id, {
      stops: Array.from({ length: 11 }, (_, i) => point(`Stop ${i}`)),
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/at most 10 stops/i);
  });

  it("surfaces the truck for a shipper searching a leg between two of its stops", async () => {
    const { agent, user } = await newTransporter(16);
    const { agent: adminAgent } = await newAdmin(17);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);
    const res = await withStops(agent, truck._id);

    // A typed search — no coordinates at all, so this is purely the
    // stop-name path, which is the case a shipper on the home page hits.
    const leg = await request(app)
      .get("/trips/search")
      .query({ fromCity: "Pune", toCity: "Nashik", date: new Date().toISOString().slice(0, 10) });

    expect(leg.status).toBe(200);
    const match = leg.body.trips.find((t) => t._id === res.body.trip._id);
    expect(match).toBeDefined();
    expect(match.matchType).toBe("stop");
  });

  it("does NOT surface it for the same two stops in the opposite order", async () => {
    const { agent, user } = await newTransporter(18);
    const { agent: adminAgent } = await newAdmin(19);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);
    const res = await withStops(agent, truck._id);

    // The truck passes Pune then Nashik. Nashik -> Pune is the same road
    // travelled backwards, and it must not match.
    const reversed = await request(app)
      .get("/trips/search")
      .query({ fromCity: "Nashik", toCity: "Pune", date: new Date().toISOString().slice(0, 10) });

    expect(reversed.body.trips.map((t) => t._id)).not.toContain(res.body.trip._id);
  });

  it("matches a coordinate search along the stop-bent path", async () => {
    const { agent, user } = await newTransporter(20);
    const { agent: adminAgent } = await newAdmin(21);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);
    const res = await withStops(agent, truck._id);

    const onPath = await request(app).get("/trips/search").query({
      fromCity: "Pune",
      toCity: "Nagpur",
      fromLat: CITY.pune.lat,
      fromLng: CITY.pune.lng,
      toLat: CITY.nagpur.lat,
      toLng: CITY.nagpur.lng,
      date: new Date().toISOString().slice(0, 10),
    });

    expect(onPath.body.trips.map((t) => t._id)).toContain(res.body.trip._id);
  });

  it("replaces the whole stop list on edit, including clearing it", async () => {
    const { agent, user } = await newTransporter(22);
    const { agent: adminAgent } = await newAdmin(23);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);
    const res = await withStops(agent, truck._id);

    const reordered = await agent
      .put(`/trips/${res.body.trip._id}`)
      .send({ stops: [point("Nashik hub", "nashik"), point("Pune warehouse", "pune")] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.trip.stops.map((s) => s.address)).toEqual(["Nashik hub", "Pune warehouse"]);

    const cleared = await agent.put(`/trips/${res.body.trip._id}`).send({ stops: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.trip.stops).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. A truck's number is frozen while it's out on a run
// ---------------------------------------------------------------------------

describe("truck registration number can't change mid-trip", () => {
  const setup = async (seed) => {
    const { agent, user } = await newTransporter(seed);
    const { agent: adminAgent } = await newAdmin(seed + 100);
    const truck = await verifiedTruck(agent, adminAgent);
    await grantDriverKyc(user._id);
    return { agent, user, adminAgent, truck };
  };

  it("allows the change while the truck is idle, and sends it back for re-verification", async () => {
    const { agent, truck } = await setup(24);
    const newReg = uniqueRegNumber();

    const res = await agent.put(`/trucks/${truck._id}`).send({ regNumber: newReg });

    expect(res.status).toBe(200);
    expect(res.body.truck.regNumber).toBe(newReg);
    // The RC and insurance on file name the OLD plate — keeping the
    // verified badge would be vouching for documents that no longer match.
    expect(res.body.truck.status).toBe("pending");
    expect(res.body.msg).toMatch(/re-verification/i);
  });

  it("treats a re-submitted plate in a different format as no change at all", async () => {
    const { agent, truck } = await setup(25);

    const spaced = truck.regNumber.replace(/^(.{2})(.{2})(.{2})/, "$1 $2 $3");
    const res = await agent.put(`/trucks/${truck._id}`).send({ regNumber: spaced });

    expect(res.status).toBe(200);
    expect(res.body.truck.regNumber).toBe(truck.regNumber);
    // Nothing actually changed, so verification must survive untouched.
    expect(res.body.truck.status).toBe("verified");
  });

  it("blocks the change while a booking on the truck's trip is in transit", async () => {
    const { agent, truck } = await setup(26);
    const trip = await postTrip(agent, truck._id, { departureAt: inDays(2) });

    // 226, not 126 — setup(seed) already claims emailFor(seed + 100) for its
    // admin, and reusing that address here re-enters the OTP flow for an
    // account mid-signup rather than creating a new one.
    const { agent: shipper } = await signupUser(app, {
      email: emailFor(226),
      name: "Shipper",
      roles: ["shipper"],
    });
    const booking = await shipper.post("/bookings").send({
      tripId: trip.body.trip._id,
      capacityRequested: 5,
      goodsDescription: "Steel coils",
    });
    await agent.put(`/bookings/${booking.body.booking._id}/accept`);
    const pickedUp = await agent.put(`/bookings/${booking.body.booking._id}/confirm-pickup`);
    expect(pickedUp.body.booking.status).toBe("ongoing");

    const res = await agent.put(`/trucks/${truck._id}`).send({ regNumber: uniqueRegNumber() });

    expect(res.status).toBe(409);
    expect(res.body.msg).toMatch(/on a trip right now/i);
    expect(res.body.msg).toContain("Pune");

    const untouched = await Truck.findById(truck._id);
    expect(untouched.regNumber).toBe(truck.regNumber);
    expect(untouched.status).toBe("verified");
  });

  it("blocks the change on a departed trip whose delivery time hasn't passed", async () => {
    const { agent, truck } = await setup(27);
    const trip = await postTrip(agent, truck._id, { departureAt: inDays(2), estimatedArrivalAt: inDays(4) });

    // Wind the clock forward on the record rather than waiting two days:
    // departed yesterday, due to deliver tomorrow.
    await Trip.updateOne(
      { _id: trip.body.trip._id },
      { $set: { departureAt: new Date(Date.now() - DAY_MS), estimatedArrivalAt: new Date(Date.now() + DAY_MS) } }
    );

    const res = await agent.put(`/trucks/${truck._id}`).send({ regNumber: uniqueRegNumber() });
    expect(res.status).toBe(409);
  });

  it("allows the change again once that delivery window has closed", async () => {
    const { agent, truck } = await setup(28);
    const trip = await postTrip(agent, truck._id, { departureAt: inDays(2), estimatedArrivalAt: inDays(4) });

    await Trip.updateOne(
      { _id: trip.body.trip._id },
      { $set: { departureAt: new Date(Date.now() - 3 * DAY_MS), estimatedArrivalAt: new Date(Date.now() - DAY_MS) } }
    );

    const res = await agent.put(`/trucks/${truck._id}`).send({ regNumber: uniqueRegNumber() });
    expect(res.status).toBe(200);
  });

  it("leaves non-identity edits alone while the truck is running", async () => {
    const { agent, truck } = await setup(29);
    const trip = await postTrip(agent, truck._id, { departureAt: inDays(2), estimatedArrivalAt: inDays(4) });
    await Trip.updateOne(
      { _id: trip.body.trip._id },
      { $set: { departureAt: new Date(Date.now() - DAY_MS), estimatedArrivalAt: new Date(Date.now() + DAY_MS) } }
    );

    // The guard is about the vehicle's IDENTITY, not about freezing the
    // whole record — a driver correcting the body type mid-run is fine.
    const res = await agent.put(`/trucks/${truck._id}`).send({ bodyType: "Container" });
    expect(res.status).toBe(200);
    expect(res.body.truck.bodyType).toBe("Container");
  });
});
