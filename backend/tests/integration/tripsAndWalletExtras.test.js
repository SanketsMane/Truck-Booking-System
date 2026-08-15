const request = require("supertest");
const app = require("../../app");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `xtra${seed}@example.test`;

// Temporarily grants the given user finance-admin scope so their own agent
// can call the admin wallet-adjust endpoint on themselves, then revokes it
// again — mirrors the pattern in bookingEdgeCases.test.js for funding a
// wallet without pulling in a whole second admin actor.
const creditWallet = async (user, agent, amount) => {
  user.isAdmin = true;
  user.adminScope = "finance";
  await user.save();
  try {
    return await agent.post(`/admin/wallets/${user._id}/adjust`).send({
      amount,
      direction: "credit",
      reason: "test funding",
    });
  } finally {
    user.isAdmin = false;
    user.adminScope = undefined;
    await user.save();
  }
};

beforeEach(async () => {
  await disableVerificationGate();
});

describe("GET /trips/popular-routes", () => {
  it("works with no auth and returns 200", async () => {
    const res = await request(app).get("/trips/popular-routes");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.routes)).toBe(true);
  });
});

describe("GET /trips/me", () => {
  it("shows a transporter's own trips but not another transporter's, and blocks non-transporters", async () => {
    const { agent: transporterAAgent } = await signupUser(app, {
      email: emailFor(1),
      name: "Transporter A",
      roles: ["transporter"],
    });
    const { agent: transporterBAgent } = await signupUser(app, {
      email: emailFor(2),
      name: "Transporter B",
      roles: ["transporter"],
    });
    const { agent: shipperAgent } = await signupUser(app, {
      email: emailFor(3),
      name: "Shipper",
      roles: ["shipper"],
    });

    const tripA = await postTestTrip(transporterAAgent, { fromCity: "Pune", toCity: "Nashik" });

    const resA = await transporterAAgent.get("/trips/me");
    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(Array.isArray(resA.body.trips)).toBe(true);
    expect(resA.body.trips.map((t) => t._id)).toContain(tripA._id);

    const resB = await transporterBAgent.get("/trips/me");
    expect(resB.status).toBe(200);
    expect(resB.body.trips.map((t) => t._id)).not.toContain(tripA._id);
    expect(resB.body.trips).toHaveLength(0);

    const resShipper = await shipperAgent.get("/trips/me");
    expect(resShipper.status).toBe(403);
  });
});

describe("POST /trips/search-alerts", () => {
  it("saves a search alert with a valid body", async () => {
    const { agent } = await signupUser(app, { email: emailFor(4), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/trips/search-alerts").send({
      fromCity: "Pune",
      toCity: "Nashik",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert).toMatchObject({ fromCity: "Pune", toCity: "Nashik" });
  });

  it("rejects a body missing a required field", async () => {
    const { agent } = await signupUser(app, { email: emailFor(5), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/trips/search-alerts").send({ fromCity: "Pune" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /trips/:id (edit)", () => {
  it("lets the owning transporter change a field, and reflects it in the response", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(6),
      name: "Owner",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent, { pricePerTon: 1000 });

    const res = await ownerAgent.put(`/trips/${trip._id}`).send({ pricePerTon: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.pricePerTon).toBe(1500);
  });

  it("blocks a different transporter from editing someone else's trip", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(7),
      name: "Owner",
      roles: ["transporter"],
    });
    const { agent: otherAgent } = await signupUser(app, {
      email: emailFor(8),
      name: "Other",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent, { pricePerTon: 1000 });

    const res = await otherAgent.put(`/trips/${trip._id}`).send({ pricePerTon: 2000 });
    // editTrip scopes the lookup to {_id, transporter: req.auth.id}, so a
    // non-owner gets the same "not found" as a nonexistent trip.
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("DELETE /trips/:id (cancel)", () => {
  it("lets the owner cancel their trip, setting status to cancelled", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(9),
      name: "Owner",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent);

    const res = await ownerAgent.delete(`/trips/${trip._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.status).toBe("cancelled");

    const getRes = await request(app).get(`/trips/${trip._id}`);
    expect(getRes.body.trip.status).toBe("cancelled");
  });

  it("blocks a non-owner from cancelling someone else's trip", async () => {
    const { agent: ownerAgent } = await signupUser(app, {
      email: emailFor(10),
      name: "Owner",
      roles: ["transporter"],
    });
    const { agent: otherAgent } = await signupUser(app, {
      email: emailFor(11),
      name: "Other",
      roles: ["transporter"],
    });
    const trip = await postTestTrip(ownerAgent);

    const res = await otherAgent.delete(`/trips/${trip._id}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    const getRes = await request(app).get(`/trips/${trip._id}`);
    expect(getRes.body.trip.status).not.toBe("cancelled");
  });
});

describe("GET /wallet/transactions", () => {
  it("returns 200 with a paginated list, empty when there's no history", async () => {
    const { agent } = await signupUser(app, { email: emailFor(12), name: "Shipper", roles: ["shipper"] });

    const res = await agent.get("/wallet/transactions");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBe(0);
  });

  it("lists a ledger entry after a wallet credit", async () => {
    const { agent, user } = await signupUser(app, {
      email: emailFor(13),
      name: "Transporter",
      roles: ["transporter"],
    });

    await creditWallet(user, agent, 500);

    const res = await agent.get("/wallet/transactions");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ direction: "credit", amount: 500 });
  });
});

describe("POST /wallet/recharge/order", () => {
  it("fails gracefully with 400 when Razorpay isn't configured (dev/test default)", async () => {
    const { agent } = await signupUser(app, { email: emailFor(14), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/wallet/recharge/order").send({ amount: 500 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/isn't configured yet/);
  });
});

describe("POST /wallet/recharge/verify", () => {
  it("returns 404 when no matching recharge order exists", async () => {
    const { agent } = await signupUser(app, { email: emailFor(15), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/wallet/recharge/verify").send({
      razorpay_order_id: "order_nonexistent123",
      razorpay_payment_id: "pay_nonexistent123",
      razorpay_signature: "deadbeef",
    });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/no matching recharge order/i);
  });
});

describe("POST /wallet/withdrawals and GET /wallet/withdrawals", () => {
  it("creates a withdrawal within balance and lists it, but rejects one exceeding balance", async () => {
    const { agent, user } = await signupUser(app, {
      email: emailFor(16),
      name: "Transporter",
      roles: ["transporter"],
    });

    await creditWallet(user, agent, 1000);

    const withdrawRes = await agent.post("/wallet/withdrawals").send({
      amount: 400,
      payoutMethod: "upi",
      upiId: "transporter@upi",
    });
    expect(withdrawRes.status).toBe(201);
    expect(withdrawRes.body.success).toBe(true);
    expect(withdrawRes.body.request).toMatchObject({ amount: 400, payoutMethod: "upi", status: "pending" });

    const listRes = await agent.get("/wallet/withdrawals");
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0]).toMatchObject({ amount: 400, payoutMethod: "upi" });

    // Only 600 left in the wallet (1000 credited - 400 withdrawn) — asking
    // for more than that should be rejected as insufficient balance.
    const overdraftRes = await agent.post("/wallet/withdrawals").send({
      amount: 700,
      payoutMethod: "upi",
      upiId: "transporter@upi",
    });
    expect(overdraftRes.status).toBe(400);
    expect(overdraftRes.body.success).toBe(false);
    expect(overdraftRes.body.msg).toMatch(/insufficient/i);
  });

  it("blocks a non-transporter from requesting a withdrawal", async () => {
    const { agent } = await signupUser(app, { email: emailFor(17), name: "Shipper", roles: ["shipper"] });

    const res = await agent.post("/wallet/withdrawals").send({
      amount: 100,
      payoutMethod: "upi",
      upiId: "shipper@upi",
    });
    expect(res.status).toBe(403);
  });
});
