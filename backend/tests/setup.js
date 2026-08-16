const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let replset;

// The app under test logs plenty in its normal request path (SMS-provider
// console output, the MASTER_OTP dev-bypass warning, etc.) — none of that
// is test output. console.error stays untouched since that's genuinely
// useful when a test fails.
global.console.log = () => {};
global.console.warn = () => {};

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
}, 60000);

// Every collection is wiped between individual tests (not just between
// files) — integration tests build up multi-actor state (users, trips,
// bookings) and a leftover document from a previous `it()` block silently
// changing a `find()`'s result set is exactly the kind of flaky-test bug
// this avoids.
afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});
