const app = require("../../app");
const {
  signupUser,
  makeAdmin,
  uploadTestFile,
  submitVerification,
  disableVerificationGate,
} = require("../helpers");

const emailFor = (seed) => `user${seed}@trucks-extras.test`;

const newTransporter = async (seed) => {
  const { agent, user } = await signupUser(app, {
    email: emailFor(seed),
    name: `Transporter ${seed}`,
    roles: ["transporter"],
  });
  return { agent, user };
};

const registerTruck = async (agent, overrides = {}) => {
  const res = await agent.post("/trucks").send({
    regNumber: overrides.regNumber || `MH${Date.now()}${Math.floor(Math.random() * 100000)}`,
    truckType: overrides.truckType || "Open Body",
    bodyType: overrides.bodyType || "Flatbed",
    totalCapacity: overrides.totalCapacity ?? 20,
  });
  if (!res.body.success) {
    throw new Error(`registerTruck failed: ${res.body.msg}`);
  }
  return res.body.truck;
};

beforeEach(async () => {
  await disableVerificationGate();
});

describe("GET /trucks/me", () => {
  it("returns only the calling transporter's own trucks", async () => {
    const { agent: agentA } = await newTransporter(1);
    const { agent: agentB } = await newTransporter(2);

    const truckA = await registerTruck(agentA, { regNumber: "MH01AA0001" });
    await registerTruck(agentB, { regNumber: "MH01BB0002" });

    const res = await agentA.get("/trucks/me");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.trucks)).toBe(true);
    expect(res.body.trucks).toHaveLength(1);
    expect(res.body.trucks[0]._id).toBe(truckA._id);
    expect(res.body.trucks[0].regNumber).toBe("MH01AA0001");
  });

  it("returns an empty list for a transporter with no trucks", async () => {
    const { agent } = await newTransporter(3);
    const res = await agent.get("/trucks/me");
    expect(res.status).toBe(200);
    expect(res.body.trucks).toEqual([]);
  });
});

describe("PUT /trucks/:id", () => {
  it("lets the owner update fields like totalCapacity", async () => {
    const { agent } = await newTransporter(4);
    const truck = await registerTruck(agent, { regNumber: "MH02AA0001", totalCapacity: 15 });

    const res = await agent.put(`/trucks/${truck._id}`).send({ totalCapacity: 25 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.truck.totalCapacity).toBe(25);
    expect(res.body.truck._id).toBe(truck._id);
  });

  it("does not let a different transporter update someone else's truck", async () => {
    const { agent: owner } = await newTransporter(5);
    const { agent: stranger } = await newTransporter(6);
    const truck = await registerTruck(owner, { regNumber: "MH03AA0001", totalCapacity: 15 });

    const res = await stranger.put(`/trucks/${truck._id}`).send({ totalCapacity: 30 });
    // updateTruck scopes its findOneAndUpdate filter to { _id, owner: req.auth.id },
    // so a non-owner's request simply doesn't match any document and falls through
    // to the generic "not found" branch rather than a dedicated ownership check.
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /trucks/:id/documents", () => {
  it("attaches a document and the truck reflects it", async () => {
    const { agent } = await newTransporter(7);
    const truck = await registerTruck(agent, { regNumber: "MH04AA0001" });
    const fileId = await uploadTestFile(agent);

    const res = await agent
      .post(`/trucks/${truck._id}/documents`)
      .send({ documents: [{ docType: "rc", fileId }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.truck.documents).toHaveLength(1);
    expect(res.body.truck.documents[0].docType).toBe("rc");
    expect(res.body.truck.documents[0].url).toContain(fileId);
  });

  it("resubmits a rejected truck back to pending when documents are added", async () => {
    const { agent } = await newTransporter(8);
    const { agent: adminAgent, user: adminUser } = await signupUser(app, {
      email: emailFor(80),
      name: "Admin Eight",
    });
    await makeAdmin(adminUser, "full");

    const truck = await registerTruck(agent, { regNumber: "MH05AA0001" });
    const rejectRes = await adminAgent.put(`/trucks/${truck._id}/review`).send({ status: "rejected", reason: "Bad scan" });
    expect(rejectRes.body.truck.status).toBe("rejected");

    const fileId = await uploadTestFile(agent);
    const res = await agent
      .post(`/trucks/${truck._id}/documents`)
      .send({ documents: [{ docType: "insurance", fileId }] });

    expect(res.status).toBe(200);
    expect(res.body.truck.status).toBe("pending");
    expect(res.body.truck.rejectReason).toBeUndefined();
  });
});

describe("POST /trucks/:id/photos", () => {
  it("attaches a photo and the truck reflects it", async () => {
    const { agent } = await newTransporter(9);
    const truck = await registerTruck(agent, { regNumber: "MH06AA0001" });
    const fileId = await uploadTestFile(agent);

    const res = await agent.post(`/trucks/${truck._id}/photos`).send({ photos: [{ fileId }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.truck.photos).toHaveLength(1);
    expect(res.body.truck.photos[0].url).toContain(fileId);
  });
});

describe("GET /trucks/queue", () => {
  it("forbids a non-admin", async () => {
    const { agent } = await newTransporter(10);
    const res = await agent.get("/trucks/queue");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns a list of trucks for an admin", async () => {
    const { agent } = await newTransporter(11);
    await registerTruck(agent, { regNumber: "MH07AA0001" });

    const { agent: adminAgent, user: adminUser } = await signupUser(app, {
      email: emailFor(110),
      name: "Admin Eleven",
    });
    await makeAdmin(adminUser, "full");

    const res = await adminAgent.get("/trucks/queue");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.trucks)).toBe(true);
    expect(res.body.trucks.some((t) => t.regNumber === "MH07AA0001")).toBe(true);
  });
});

describe("GET /verification/me", () => {
  it("shows the calling user's own verification and not another user's", async () => {
    const { agent: agentA } = await newTransporter(12);
    const { agent: agentB } = await newTransporter(13);

    const verificationId = await submitVerification(agentA, "transporter");
    await submitVerification(agentB, "transporter");

    const res = await agentA.get("/verification/me");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.verifications)).toBe(true);
    expect(res.body.verifications).toHaveLength(1);
    expect(res.body.verifications[0]._id).toBe(verificationId);
    expect(res.body.verifications[0].status).toBe("pending");
  });

  it("returns an empty list for a user with no submitted verifications", async () => {
    const { agent } = await newTransporter(14);
    const res = await agent.get("/verification/me");
    expect(res.status).toBe(200);
    expect(res.body.verifications).toEqual([]);
  });
});

describe("GET /verification/queue", () => {
  it("forbids a non-admin", async () => {
    const { agent } = await newTransporter(15);
    const res = await agent.get("/verification/queue");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns the pending verification for an admin", async () => {
    const { agent } = await newTransporter(16);
    const verificationId = await submitVerification(agent, "transporter");

    const { agent: adminAgent, user: adminUser } = await signupUser(app, {
      email: emailFor(160),
      name: "Admin Sixteen",
    });
    await makeAdmin(adminUser, "full");

    const res = await adminAgent.get("/verification/queue");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.verifications)).toBe(true);
    expect(res.body.verifications.some((v) => v._id === verificationId)).toBe(true);
  });
});
