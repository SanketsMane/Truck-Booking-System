const mongoose = require("mongoose");
const app = require("../../app");
const Truck = require("../../models/truckModel");
const DeletedTruck = require("../../models/deletedTruckModel");
const AuditLog = require("../../models/auditLogModel");
const { signupUser, makeAdmin, disableVerificationGate, postTestTrip, uniqueRegNumber } = require("../helpers");

const emailFor = (seed) => `user${seed}@truck-deletion.test`;

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

const registerTruck = async (agent, overrides = {}) => {
  const res = await agent.post("/trucks").send({
    regNumber: overrides.regNumber || uniqueRegNumber(),
    truckType: overrides.truckType || "Open Body",
    bodyType: overrides.bodyType || "Flatbed",
    totalCapacity: overrides.totalCapacity ?? 20,
  });
  if (!res.body.success) throw new Error(`registerTruck failed: ${res.body.msg}`);
  return res.body.truck;
};

beforeEach(async () => {
  await disableVerificationGate();
});

describe("transporter raises a truck delete request", () => {
  it("rejects a reason shorter than 10 characters", async () => {
    const { agent } = await newTransporter(1);
    const truck = await registerTruck(agent);

    const res = await agent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "too short" });
    expect(res.status).toBe(400);
  });

  it("submits a pending request, and blocks a second pending request for the same truck", async () => {
    const { agent } = await newTransporter(2);
    const truck = await registerTruck(agent);

    const first = await agent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "No longer in service" });
    expect(first.status).toBe(201);
    expect(first.body.request.status).toBe("pending");
    expect(first.body.request.regNumber).toBe(truck.regNumber);

    const second = await agent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "Duplicate attempt here" });
    expect(second.status).toBe(409);
  });

  it("404s for a truck the caller doesn't own", async () => {
    const { agent: ownerAgent } = await newTransporter(3);
    const { agent: otherAgent } = await newTransporter(4);
    const truck = await registerTruck(ownerAgent);

    const res = await otherAgent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "Not mine to delete" });
    expect(res.status).toBe(404);
  });
});

describe("admin resolves a delete request", () => {
  it("rejecting requires a resolution note, and the transporter can re-request afterwards", async () => {
    const { agent: txAgent } = await newTransporter(5);
    const { agent: adminAgent } = await newAdmin(6);
    const truck = await registerTruck(txAgent);

    const raised = await txAgent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "Selling the vehicle" });
    const requestId = raised.body.request._id;

    const missingNote = await adminAgent.put(`/admin/truck-delete-requests/${requestId}/resolve`).send({ status: "rejected" });
    expect(missingNote.status).toBe(400);

    const rejected = await adminAgent
      .put(`/admin/truck-delete-requests/${requestId}/resolve`)
      .send({ status: "rejected", resolutionNote: "Truck still has open bookings" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.request.status).toBe("rejected");

    const stillExists = await Truck.findById(truck._id);
    expect(stillExists).not.toBeNull();

    const reRaised = await txAgent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "Selling the vehicle now" });
    expect(reRaised.status).toBe(201);
  });

  it("approving permanently deletes the truck, archives it, and writes an audit log entry", async () => {
    const { agent: txAgent, user: txUser } = await newTransporter(7);
    const { agent: adminAgent, user: adminUser } = await newAdmin(8);
    const truck = await registerTruck(txAgent);

    const raised = await txAgent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "Retiring this vehicle" });
    const requestId = raised.body.request._id;

    const approved = await adminAgent
      .put(`/admin/truck-delete-requests/${requestId}/resolve`)
      .send({ status: "approved", resolutionNote: "Confirmed no active trips" });
    expect(approved.status).toBe(200);
    expect(approved.body.request.status).toBe("approved");

    const deletedTruck = await Truck.findById(truck._id);
    expect(deletedTruck).toBeNull();

    const archived = await DeletedTruck.findOne({ regNumber: truck.regNumber });
    expect(archived).not.toBeNull();
    expect(String(archived.owner)).toBe(String(txUser._id));
    expect(String(archived.deletedBy)).toBe(String(adminUser._id));
    expect(String(archived.deleteRequest)).toBe(String(requestId));

    const auditEntry = await AuditLog.findOne({
      action: "truck.delete",
      targetId: new mongoose.Types.ObjectId(truck._id),
    });
    expect(auditEntry).not.toBeNull();

    const myTrucks = await txAgent.get("/trucks/me");
    expect(myTrucks.body.trucks.map((t) => t._id)).not.toContain(truck._id);
  });

  it("rolls back to pending when the truck has an active trip, instead of deleting it", async () => {
    const { agent: txAgent } = await newTransporter(9);
    const { agent: adminAgent } = await newAdmin(10);
    const trip = await postTestTrip(txAgent);

    const raised = await txAgent.post(`/trucks/${trip.truck}/delete-request`).send({ reason: "Trying to delete anyway" });
    const requestId = raised.body.request._id;

    const approved = await adminAgent.put(`/admin/truck-delete-requests/${requestId}/resolve`).send({ status: "approved" });
    expect(approved.status).toBe(409);

    const stillExists = await Truck.findById(trip.truck);
    expect(stillExists).not.toBeNull();

    const requestAfter = await adminAgent.get(`/admin/truck-delete-requests?status=pending`);
    expect(requestAfter.body.items.map((r) => r._id)).toContain(requestId);
  });

  it("a support-scope admin can view the queue but not resolve it", async () => {
    const { agent: txAgent } = await newTransporter(11);
    const { agent: supportAgent } = await newAdmin(12, "support");
    const truck = await registerTruck(txAgent);

    const raised = await txAgent.post(`/trucks/${truck._id}/delete-request`).send({ reason: "Reason long enough here" });
    const requestId = raised.body.request._id;

    const list = await supportAgent.get("/admin/truck-delete-requests");
    expect(list.status).toBe(200);

    const resolve = await supportAgent.put(`/admin/truck-delete-requests/${requestId}/resolve`).send({ status: "approved" });
    expect(resolve.status).toBe(403);
  });
});

describe("admin deletes a truck directly (no request involved)", () => {
  it("deletes and archives with no deleteRequest link, and notifies the owner", async () => {
    const { agent: txAgent, user: txUser } = await newTransporter(13);
    const { agent: adminAgent } = await newAdmin(14);
    const truck = await registerTruck(txAgent);

    const res = await adminAgent.delete(`/admin/trucks/${truck._id}`).send({ reason: "Duplicate listing, cleaning up" });
    expect(res.status).toBe(200);

    const deletedTruck = await Truck.findById(truck._id);
    expect(deletedTruck).toBeNull();

    const archived = await DeletedTruck.findOne({ regNumber: truck.regNumber });
    expect(archived).not.toBeNull();
    expect(archived.deleteRequest).toBeFalsy();
    expect(String(archived.owner)).toBe(String(txUser._id));

    const searchResult = await adminAgent.get(`/admin/deleted-trucks?search=${truck.regNumber}`);
    expect(searchResult.status).toBe(200);
    expect(searchResult.body.items.map((t) => t.regNumber)).toContain(truck.regNumber);
  });

  it("is blocked (409) when the truck has an active trip, and archives nothing", async () => {
    const { agent: txAgent } = await newTransporter(15);
    const { agent: adminAgent } = await newAdmin(16);
    const trip = await postTestTrip(txAgent);

    const before = await DeletedTruck.countDocuments({});
    const res = await adminAgent.delete(`/admin/trucks/${trip.truck}`).send({ reason: "Trying to delete anyway" });
    expect(res.status).toBe(409);

    const stillExists = await Truck.findById(trip.truck);
    expect(stillExists).not.toBeNull();
    const after = await DeletedTruck.countDocuments({});
    expect(after).toBe(before);
  });

  it("requires a reason", async () => {
    const { agent: txAgent } = await newTransporter(17);
    const { agent: adminAgent } = await newAdmin(18);
    const truck = await registerTruck(txAgent);

    const res = await adminAgent.delete(`/admin/trucks/${truck._id}`).send({});
    expect(res.status).toBe(400);
  });

  it("a support-scope admin cannot delete directly", async () => {
    const { agent: txAgent } = await newTransporter(19);
    const { agent: supportAgent } = await newAdmin(20, "support");
    const truck = await registerTruck(txAgent);

    const res = await supportAgent.delete(`/admin/trucks/${truck._id}`).send({ reason: "Should not be allowed" });
    expect(res.status).toBe(403);
  });
});
