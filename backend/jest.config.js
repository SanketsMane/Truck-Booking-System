module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  // Integration tests hit a real (in-memory) MongoDB plus, in the happy-path
  // spec, walk a long multi-actor flow — Jest's 5s default is too tight.
  testTimeout: 20000,
  // mongodb-memory-server downloads/spins up a real mongod per worker; one
  // worker keeps this predictable in CI rather than N mongod instances
  // racing for resources.
  maxWorkers: 1,
};
