const request = require("supertest");
const User = require("../models/userModel");
const PlatformSetting = require("../models/platformSettingModel");

const MASTER_OTP = process.env.MASTER_OTP || "123456";

// Generates a registration number matching REG_NUMBER_PATTERN
// (backend/utils/regNumber.js) — real state code + digits, not an
// oversized Date.now()-based string, since the validator now rejects
// anything that doesn't look like a real Indian plate. The counter (not
// pure Date.now()/Math.random()) keeps successive calls within the same
// test run from colliding.
let regNumberSeq = 0;
const uniqueRegNumber = () => {
  regNumberSeq += 1;
  const rto = String(1 + (regNumberSeq % 99)).padStart(2, "0");
  const num = String(regNumberSeq % 10000).padStart(4, "0");
  return `MH${rto}AA${num}`;
};

// A minimal-but-real PNG — just the 8-byte PNG magic number detectFileType
// checks for. Real bytes, not a mocked content-type header, since
// fileController.uploadFile sniffs the actual buffer, not the client's
// (spoofable) declared mimetype.
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Deterministic per input (not a global counter) so calling signupUser more
// than once for the SAME email — re-authenticating an already-registered
// test user — always derives the same mobile number and never trips
// verifyOtp's "mobile changed, check it's not already taken" path. Matches
// MOBILE_PATTERN (backend/config/marketplaceConfig.js): 10 digits, first
// digit 6-9.
const uniqueMobile = (seed) => {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return `9${String(hash % 1000000000).padStart(9, "0")}`;
};

// Signs up (or logs into) a user via the real OTP flow — MASTER_OTP bypass,
// same as manual dev testing — and returns a supertest agent with the
// session cookie already attached, so callers just do agent.get(...) etc.
// mobile defaults to a deterministic-per-email value since verifyOtp now
// requires one to complete a brand-new signup — pass an explicit `mobile`
// only when a test cares about a specific number.
const signupUser = async (app, { email, name, mobile, roles = [] }) => {
  const agent = request.agent(app);
  await agent.post("/auth/request-otp").send({ email });
  const res = await agent
    .post("/auth/verify-otp")
    .send({ email, otp: MASTER_OTP, name, mobile: mobile || uniqueMobile(email), roles });
  if (!res.body.success) {
    throw new Error(`signupUser(${email}) failed: ${res.body.msg}`);
  }
  const user = await User.findOne({ email });
  return { agent, user };
};

// Promotes an already-signed-up user to admin directly via the DB.
// authMiddleware re-reads isAdmin/adminScope from the DB on every request
// (it never trusts the JWT for these — see middleWare/middleWare.js), so
// the existing agent's session cookie picks this up on its very next
// request with no new login needed.
const makeAdmin = async (user, scope = "full") => {
  user.isAdmin = true;
  user.adminScope = scope;
  await user.save();
  return user;
};

// Uploads a real (tiny, valid) PNG through the actual multer + magic-byte
// detection pipeline and returns its fileId, for use in a verification/
// truck-document submission payload.
const uploadTestFile = async (agent) => {
  const res = await agent.post("/files").attach("file", PNG_BYTES, { filename: "doc.png", contentType: "image/png" });
  if (!res.body.success) {
    throw new Error(`uploadTestFile failed: ${res.body.msg}`);
  }
  return res.body.file.id;
};

// Submits KYC for `type` ("shipper" | "transporter") through the real API
// and returns the created verification's id.
const submitVerification = async (agent, type) => {
  const fileId = await uploadTestFile(agent);
  const res = await agent
    .post("/verification")
    .send({ type, documents: [{ docType: "aadhaar", fileId }] });
  if (!res.body.success) {
    throw new Error(`submitVerification(${type}) failed: ${res.body.msg}`);
  }
  return res.body.verification._id;
};

// Turns off the SRS-02.3 verification gate so tests focused on booking/trip
// mechanics (not the gate itself, which happyPath.test.js already covers)
// don't need to run every actor through KYC review first.
const disableVerificationGate = async () => {
  const settings = await PlatformSetting.getSettings();
  settings.verificationGateEnabled = false;
  await settings.save();
};

// Registers a truck and publishes a trip as `transporterAgent`, with sane
// defaults — for tests where the trip itself is just setup, not the thing
// under test. Requires the verification gate to be off (see above) unless
// the caller has already gotten this transporter/truck KYC-verified.
const postTestTrip = async (transporterAgent, overrides = {}) => {
  const truckRes = await transporterAgent.post("/trucks").send({
    regNumber: overrides.regNumber || uniqueRegNumber(),
    truckType: "Open Body",
    bodyType: "Flatbed",
    totalCapacity: overrides.totalCapacity || 20,
  });
  if (!truckRes.body.success) {
    throw new Error(`postTestTrip: truck registration failed: ${truckRes.body.msg}`);
  }
  const truckId = truckRes.body.truck._id;

  const departureAt = overrides.departureAt || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const tripRes = await transporterAgent.post("/trips").send({
    truckId,
    fromCity: overrides.fromCity || "Pune",
    toCity: overrides.toCity || "Nashik",
    departureAt,
    pickupPoint: overrides.pickupPoint || { address: "Pune warehouse" },
    dropPoint: overrides.dropPoint || { address: "Nashik yard" },
    totalCapacity: overrides.totalCapacity || 20,
    availableCapacity: overrides.availableCapacity ?? overrides.totalCapacity ?? 20,
    pricePerTon: overrides.pricePerTon || 1000,
  });
  if (!tripRes.body.success) {
    throw new Error(`postTestTrip: trip posting failed: ${tripRes.body.msg}`);
  }
  return tripRes.body.trip;
};

module.exports = {
  signupUser,
  makeAdmin,
  uploadTestFile,
  submitVerification,
  disableVerificationGate,
  postTestTrip,
  uniqueRegNumber,
  uniqueMobile,
  MASTER_OTP,
};
