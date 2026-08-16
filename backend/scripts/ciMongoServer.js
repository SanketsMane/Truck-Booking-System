// CI-only helper: starts an ephemeral MongoDB (single-node replica set) and
// writes its connection URI to a file, then stays running until killed.
// Used by the e2e CI job to give
// the real server.js process (not app.js via supertest) something to
// connect to, without depending on a Docker service container or a real
// Atlas cluster in CI.
//
// Usage: MONGO_URI_FILE=/tmp/mongo-uri.txt node scripts/ciMongoServer.js
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const fs = require("fs");

(async () => {
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replset.getUri();
  const uriFile = process.env.MONGO_URI_FILE || "/tmp/mongo-uri.txt";
  fs.writeFileSync(uriFile, uri);
  console.log(`Mongo memory replica set ready at ${uri} (written to ${uriFile})`);

  const shutdown = async () => {
    await replset.stop();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
