// Pluggable object storage for KYC/truck documents. Two providers behind
// the same {saveFile, readFile, deleteFile} interface — fileController.js
// never knows which one is active:
//
//   STORAGE_PROVIDER=local (default) — writes to backend/uploads/ on local
//   disk. Fine for local dev; NOT safe for a real deployment (see
//   validateEnv.js, which refuses to boot with this provider when
//   NODE_ENV=production — most hosts, including this project's target of
//   Render, use an ephemeral container filesystem that's wiped on every
//   restart/redeploy, and none of them share disk across instances).
//
//   STORAGE_PROVIDER=s3 — any S3-compatible object store: real AWS S3, or
//   Cloudflare R2 / Backblaze B2 / DigitalOcean Spaces / MinIO, all of
//   which speak the same S3 API and just need S3_ENDPOINT pointed at their
//   host (leave S3_ENDPOINT unset for real AWS S3).
//
// Documents are never served from a public path either way — retrieval
// always goes through the access-controlled /files/:id route (see
// routes/fileRoutes.js). Contents are encrypted at rest (SRS §5.3) in both
// providers — what's persisted is ciphertext, decrypted only when an
// authorized request reads it back through getFile.

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { encryptBuffer, decryptBuffer } = require("./crypto");

const PROVIDER = process.env.STORAGE_PROVIDER || "local";

// ---- local disk provider (dev default) ----

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

const ensureUploadDir = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
};

const localProvider = {
  saveFile: async (buffer, originalName) => {
    await ensureUploadDir();
    const storageKey = `${crypto.randomUUID()}${path.extname(originalName)}`;
    await fs.writeFile(path.join(UPLOAD_DIR, storageKey), encryptBuffer(buffer));
    return storageKey;
  },
  readFile: async (storageKey) => {
    const encrypted = await fs.readFile(path.join(UPLOAD_DIR, storageKey));
    return decryptBuffer(encrypted);
  },
  deleteFile: async (storageKey) => {
    await fs.rm(path.join(UPLOAD_DIR, storageKey), { force: true });
  },
};

// ---- S3-compatible provider ----

// Lazily required — the AWS SDK client shouldn't even try to construct
// itself (or complain about missing config) when the local provider is
// what's actually selected, e.g. every dev machine and the test suite.
let s3Client = null;
const getS3Client = () => {
  if (s3Client) return s3Client;
  const { S3Client } = require("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    // R2/B2/Spaces/MinIO all need path-style addressing; real AWS S3 works
    // with either, so this is safe to force on for every provider.
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const s3Provider = {
  saveFile: async (buffer, originalName) => {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    const storageKey = `${crypto.randomUUID()}${path.extname(originalName)}`;
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: storageKey,
        Body: encryptBuffer(buffer),
      })
    );
    return storageKey;
  },
  readFile: async (storageKey) => {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const res = await getS3Client().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: storageKey })
    );
    const encrypted = await streamToBuffer(res.Body);
    return decryptBuffer(encrypted);
  },
  deleteFile: async (storageKey) => {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: storageKey })
    );
  },
};

const provider = PROVIDER === "s3" ? s3Provider : localProvider;

module.exports = {
  saveFile: provider.saveFile,
  readFile: provider.readFile,
  deleteFile: provider.deleteFile,
};
