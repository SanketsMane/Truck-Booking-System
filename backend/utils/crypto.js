const crypto = require("crypto");

// Encrypts provider credentials (SMS/email API keys, SMTP passwords, etc.)
// before they're stored in PlatformSetting — these are real secrets an
// admin enters through the UI, not just internal config, so they don't sit
// in the database in plaintext the way, say, a city name would.
const ALGORITHM = "aes-256-gcm";

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    const key = Buffer.from(raw, "hex");
    if (key.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be a 32-byte value, hex-encoded (64 hex characters)");
    }
    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY is required in production — generate one with `openssl rand -hex 32`");
  }

  // Dev-only fallback so local setup doesn't require generating a key —
  // deterministic from SECRET_KEY, never used when NODE_ENV=production.
  return crypto.scryptSync(process.env.SECRET_KEY || "dev-only-fallback", "sharetruck-dev-salt", 32);
};

const encrypt = (plaintext) => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
};

const decrypt = (encoded) => {
  const key = getKey();
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

// Same scheme, operating on raw bytes instead of forcing a utf8 string
// round-trip — used for uploaded file contents (KYC/truck documents),
// where the string-oriented encrypt/decrypt above would corrupt binary data.
const encryptBuffer = (buffer) => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
};

const decryptBuffer = (encoded) => {
  const key = getKey();
  const iv = encoded.subarray(0, 12);
  const authTag = encoded.subarray(12, 28);
  const ciphertext = encoded.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

module.exports = { encrypt, decrypt, encryptBuffer, decryptBuffer };
