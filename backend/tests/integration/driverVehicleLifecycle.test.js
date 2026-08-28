// Covers the truck lifecycle rules that draftTripFlow.test.js's postTrip-gate
// rewrite doesn't already exercise: registering a fleet (the
// one-candidate-at-a-time cap and the one-active-truck swap are both gone —
// a transporter runs as many verified vehicles as they own), the
// authorizedToList consent requirement, truck deletion respecting ALL trip
// history (not just live trips), and the role-scoped driver KYC document
// requirement.
const app = require("../../app");
const Truck = require("../../models/truckModel");
const Trip = require("../../models/tripModel");
const Verification = require("../../models/verificationModel");
const { signupUser, makeAdmin, uploadTestFile, uniqueRegNumber } = require("../helpers");

const emailFor = (seed) => `lifecycle${seed}@example.test`;

const newTransporter = async (seed) => {
  const { agent, user } = await signupUser(app, {
    email: emailFor(seed),
    name: `Transporter ${seed}`,
    roles: ["transporter"],
  });
  return { agent, user };
};

const newAdmin = async (seed, scope = "full") => {
  const { agent, user } = await signupUser(app, { email: emailFor(seed), name: `Admin ${seed}` });
  await makeAdmin(user, scope);
  return { agent, user };
};

const registerTruck = (agent, overrides = {}) =>
  agent.post("/trucks").send({
    regNumber: overrides.regNumber || uniqueRegNumber(),
    truckType: "Open Body",
    bodyType: "Flatbed",
    totalCapacity: overrides.totalCapacity ?? 20,
    authorizedToList: overrides.authorizedToList ?? true,
  });

describe("POST /trucks — authorizedToList consent", () => {
  it("rejects registration without the authorization consent", async () => {
    const { agent } = await newTransporter(1);
    const res = await agent.post("/trucks").send({
      regNumber: uniqueRegNumber(),
      truckType: "Open Body",
      bodyType: "Flatbed",
      totalCapacity: 20,
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/authorized/i);
  });

  it("rejects registration when authorizedToList is explicitly false", async () => {
    const { agent } = await newTransporter(2);
    const res = await agent.post("/trucks").send({
      regNumber: uniqueRegNumber(),
      truckType: "Open Body",
      bodyType: "Flatbed",
      totalCapacity: 20,
      authorizedToList: false,
    });
    expect(res.status).toBe(400);
  });

  it("records authorizedAt on a valid registration", async () => {
    const { agent } = await newTransporter(3);
    const res = await registerTruck(agent);
    expect(res.status).toBe(201);
    expect(res.body.truck.authorizedToList).toBe(true);
    expect(res.body.truck.authorizedAt).toBeTruthy();
  });
});

describe("POST /trucks — a transporter can register a whole fleet", () => {
  it("allows registering a second truck while the first is still an unreviewed candidate", async () => {
    const { agent } = await newTransporter(4);
    const first = await registerTruck(agent);
    expect(first.status).toBe(201);

    // Used to be a 409 ("one truck awaiting verification at a time"). A
    // transporter putting three lorries on the platform at once was being
    // made to queue them one at a time for our convenience, not theirs.
    const second = await registerTruck(agent);
    expect(second.status).toBe(201);
    expect(second.body.truck._id).not.toBe(first.body.truck._id);
  });

  it("still refuses the same registration number twice", async () => {
    const { agent } = await newTransporter(40);
    const regNumber = uniqueRegNumber();
    expect((await registerTruck(agent, { regNumber })).status).toBe(201);

    const duplicate = await registerTruck(agent, { regNumber });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.msg).toMatch(/already listed/i);
  });

  it("does not block a new registration once the prior candidate was rejected", async () => {
    const { agent } = await newTransporter(5);
    const first = await registerTruck(agent);
    const { agent: adminAgent } = await newAdmin(6, "verification");
    await adminAgent.put(`/trucks/${first.body.truck._id}/review`).send({ status: "rejected", reason: "Bad scan" });

    const second = await registerTruck(agent);
    expect(second.status).toBe(201);
  });

  it("does NOT block registering a new truck (Change Vehicle) once the owner already has an active truck", async () => {
    const { agent } = await newTransporter(7);
    const first = await registerTruck(agent);
    const { agent: adminAgent } = await newAdmin(8, "verification");
    const reviewed = await adminAgent.put(`/trucks/${first.body.truck._id}/review`).send({ status: "verified" });
    expect(reviewed.body.truck.lifecycle).toBe("active");

    const second = await registerTruck(agent);
    expect(second.status).toBe(201);
    expect(second.body.truck.lifecycle).toBe("candidate");
  });
});

describe("PUT /trucks/:id/review — lifecycle transitions", () => {
  it("leaves a rejected truck's lifecycle as candidate", async () => {
    const { agent } = await newTransporter(9);
    const truck = await registerTruck(agent);
    const { agent: adminAgent } = await newAdmin(10, "verification");

    const res = await adminAgent.put(`/trucks/${truck.body.truck._id}/review`).send({ status: "rejected", reason: "x" });
    expect(res.status).toBe(200);
    const persisted = await Truck.findById(truck.body.truck._id);
    expect(persisted.lifecycle).toBe("candidate");
  });

  it("verifying a second truck adds it to the fleet instead of retiring the first", async () => {
    const { agent } = await newTransporter(11);
    const truckA = await registerTruck(agent);
    const { agent: adminAgent } = await newAdmin(12, "verification");
    await adminAgent.put(`/trucks/${truckA.body.truck._id}/review`).send({ status: "verified" });

    const truckB = await registerTruck(agent);
    const reviewB = await adminAgent.put(`/trucks/${truckB.body.truck._id}/review`).send({ status: "verified" });
    expect(reviewB.body.truck.lifecycle).toBe("active");

    // Verifying truckB used to demote truckA to "inactive" — the owner lost
    // a working vehicle simply by adding another. Both stay active now.
    const persistedA = await Truck.findById(truckA.body.truck._id);
    expect(persistedA.lifecycle).toBe("active");
    expect(persistedA.status).toBe("verified");

    const myTrucks = await agent.get("/trucks/me");
    expect(myTrucks.body.trucks.map((t) => t._id)).toEqual(
      expect.arrayContaining([truckA.body.truck._id, truckB.body.truck._id])
    );
  });
});

describe("Truck deletion respects trip history, not just live trips", () => {
  it("blocks deleting an inactive truck that has completed trip history", async () => {
    const { agent, user } = await newTransporter(13);
    const truckA = await registerTruck(agent);
    const { agent: adminAgent } = await newAdmin(14, "full");
    await adminAgent.put(`/trucks/${truckA.body.truck._id}/review`).send({ status: "verified" });

    // Give the driver KYC and post + complete a trip on truckA so it has
    // real history, then swap to a new active truck (Change Vehicle).
    await Verification.findOneAndUpdate(
      { user: user._id, type: "transporter" },
      { $set: { status: "verified" } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    const tripRes = await agent.post("/trips").send({
      truckId: truckA.body.truck._id,
      fromCity: "Pune",
      toCity: "Nashik",
      departureAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      pickupPoint: { address: "Pune warehouse" },
      dropPoint: { address: "Nashik yard" },
      totalCapacity: 20,
      availableCapacity: 20,
      pricePerTon: 1000,
    });
    expect(tripRes.status).toBe(201);
    await Trip.updateOne({ _id: tripRes.body.trip._id }, { status: "completed" });

    const truckB = await registerTruck(agent);
    await adminAgent.put(`/trucks/${truckB.body.truck._id}/review`).send({ status: "verified" });

    // truckA is now inactive with a COMPLETED (not live) trip on it.
    const del = await agent.post(`/trucks/${truckA.body.truck._id}/delete-request`).send({ reason: "No longer using it" });
    const resolve = await adminAgent.put(`/admin/truck-delete-requests/${del.body.request._id}/resolve`).send({ status: "approved" });
    expect(resolve.status).toBe(409);

    const stillExists = await Truck.findById(truckA.body.truck._id);
    expect(stillExists).not.toBeNull();
  });

  it("allows deleting a truck that was registered but never used for any trip", async () => {
    const { agent } = await newTransporter(15);
    const truck = await registerTruck(agent);

    const del = await agent.post(`/trucks/${truck.body.truck._id}/delete-request`).send({ reason: "Registered by mistake" });
    const { agent: adminAgent } = await newAdmin(16, "full");
    const resolve = await adminAgent
      .put(`/admin/truck-delete-requests/${del.body.request._id}/resolve`)
      .send({ status: "approved" });
    expect(resolve.status).toBe(200);

    const gone = await Truck.findById(truck.body.truck._id);
    expect(gone).toBeNull();
  });
});

describe("POST /verification — driver document requirements", () => {
  it("rejects a transporter submission missing a driving licence", async () => {
    const { agent } = await newTransporter(17);
    const fileId = await uploadTestFile(agent);
    const res = await agent.post("/verification").send({ type: "transporter", documents: [{ docType: "aadhaar", fileId }] });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/driving licence/i);
  });

  it("rejects a transporter submission missing an ID proof", async () => {
    const { agent } = await newTransporter(18);
    const fileId = await uploadTestFile(agent);
    const res = await agent
      .post("/verification")
      .send({ type: "transporter", documents: [{ docType: "driving_license", fileId }] });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/ID proof/i);
  });

  it("rejects a transporter submission when no profile photo is on file", async () => {
    const { agent } = await newTransporter(19);
    const fileId1 = await uploadTestFile(agent);
    const fileId2 = await uploadTestFile(agent);
    const res = await agent.post("/verification").send({
      type: "transporter",
      documents: [
        { docType: "aadhaar", fileId: fileId1 },
        { docType: "driving_license", fileId: fileId2 },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/profile photo/i);
  });

  it("accepts a transporter submission with ID + driving licence once a profile photo is set", async () => {
    const { agent } = await newTransporter(20);
    await agent.put("/auth/profile").send({ profilePhoto: "/files/test-profile-photo" });
    const fileId1 = await uploadTestFile(agent);
    const fileId2 = await uploadTestFile(agent);
    const res = await agent.post("/verification").send({
      type: "transporter",
      documents: [
        { docType: "aadhaar", fileId: fileId1 },
        { docType: "driving_license", fileId: fileId2 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.verification.status).toBe("pending");
  });

  it("does not require ID/DL/photo for a shipper submission (role-scoped, not a global rule)", async () => {
    const { agent } = await signupUser(app, { email: emailFor(21), name: "Shipper", roles: ["shipper"] });
    const fileId = await uploadTestFile(agent);
    const res = await agent.post("/verification").send({ type: "shipper", documents: [{ docType: "pan", fileId }] });
    expect(res.status).toBe(200);
  });
});
