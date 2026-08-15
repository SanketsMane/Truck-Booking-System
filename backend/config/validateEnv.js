// Fails fast at boot rather than mysteriously later — a missing or unsafe
// production setting should stop the process immediately with a clear
// message, not surface as a confusing 500 on someone's first request (or,
// worse, run silently insecure — e.g. a stray MASTER_OTP left set because
// it was copied from .env.development).
//
// No-op outside production: local dev and the test suite (NODE_ENV=test)
// are expected to run with a smaller, looser env — see backend/.env.example.
const REQUIRED_IN_PRODUCTION = ["SECRET_KEY", "MONGODB_URL", "FRONTEND_URL", "ENCRYPTION_KEY"];
const REQUIRED_S3_VARS = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];

const validateEnv = () => {
  if (process.env.NODE_ENV !== "production") return;

  const errors = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]).map(
    (key) => `${key} is required in production`
  );

  // A full auth bypass for every account if this ever ships by accident.
  if (process.env.MASTER_OTP) {
    errors.push("MASTER_OTP must not be set in production — it bypasses OTP verification for every account");
  }

  // The local disk provider loses every uploaded file on restart/redeploy
  // on most hosts (including this project's target of Render) — see
  // utils/objectStorage.js's own comment for why.
  if (process.env.STORAGE_PROVIDER !== "s3") {
    errors.push('STORAGE_PROVIDER must be "s3" in production (local disk uploads don\'t survive a restart/redeploy)');
  } else {
    errors.push(
      ...REQUIRED_S3_VARS.filter((key) => !process.env[key]).map(
        (key) => `${key} is required in production when STORAGE_PROVIDER=s3`
      )
    );
  }

  if (errors.length) {
    console.error("\nRefusing to start — invalid production configuration:\n");
    errors.forEach((message) => console.error(`  - ${message}`));
    console.error("\nSee backend/.env.example for guidance.\n");
    process.exit(1);
  }
};

module.exports = validateEnv;
