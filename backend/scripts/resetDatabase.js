// Destructive, one-off maintenance script: wipes every collection except
// PlatformSetting (site config — branding/SMTP/verification-gate survive
// untouched) and keeps exactly one User document (the operator's own
// admin account, by email) so the operator isn't locked out afterward.
// Not run automatically anywhere, unlike seedAdmin.js — this is a manual,
// deliberate reset, never part of a normal deploy.
//
// Usage: CONFIRM=DELETE-ALL-DATA KEEP_ADMIN_EMAIL=you@example.com node scripts/resetDatabase.js
//
// Both env vars are required and checked verbatim (not just "truthy") so
// this can't be triggered by an empty/placeholder value slipping into an
// env file — same "fail loudly" posture as seedAdmin.js's production
// email check.

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({
  path: path.join(__dirname, "..", process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"),
});

const mongoose = require("mongoose");
const User = require("../models/userModel");
const Trip = require("../models/tripModel");
const Truck = require("../models/truckModel");
const Booking = require("../models/bookingModel");
const Verification = require("../models/verificationModel");
const Dispute = require("../models/disputeModel");
const Rating = require("../models/ratingModel");
const ChatThread = require("../models/chatThreadModel");
const Message = require("../models/messageModel");
const Notification = require("../models/notificationModel");
const SavedSearch = require("../models/savedSearchModel");
const AuditLog = require("../models/auditLogModel");
const UploadedFile = require("../models/uploadedFileModel");
const PushSubscription = require("../models/pushSubscriptionModel");
const SupportRequest = require("../models/supportRequestModel");
const DeletedTruck = require("../models/deletedTruckModel");
const TruckDeleteRequest = require("../models/truckDeleteRequestModel");

// Every collection to fully clear. PlatformSetting is deliberately absent
// — it's site configuration, not app data, and the operator asked to keep it.
const MODELS_TO_CLEAR = [
  Trip,
  Truck,
  Booking,
  Verification,
  Dispute,
  Rating,
  ChatThread,
  Message,
  Notification,
  SavedSearch,
  AuditLog,
  UploadedFile,
  PushSubscription,
  SupportRequest,
  DeletedTruck,
  TruckDeleteRequest,
];

(async () => {
  if (process.env.CONFIRM !== "DELETE-ALL-DATA") {
    console.error('Refusing to run — set CONFIRM=DELETE-ALL-DATA to proceed.');
    process.exit(1);
  }
  const keepEmail = (process.env.KEEP_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!keepEmail) {
    console.error("Refusing to run — KEEP_ADMIN_EMAIL is unset.");
    process.exit(1);
  }
  if (!process.env.MONGODB_URL) {
    console.error("MONGODB_URL is not set — nothing to connect to.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const keeper = await User.findOne({ email: keepEmail });
  if (!keeper) {
    console.error(`Refusing to run — no user found with email ${keepEmail}. Nothing was deleted.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Keeping user: ${keeper.email} (isAdmin=${keeper.isAdmin}, adminScope=${keeper.adminScope})`);
  console.log("\nDeleting:");

  for (const Model of MODELS_TO_CLEAR) {
    const { deletedCount } = await Model.deleteMany({});
    console.log(`  ${Model.modelName}: ${deletedCount}`);
  }

  const { deletedCount: usersDeleted } = await User.deleteMany({ _id: { $ne: keeper._id } });
  console.log(`  User (all but ${keeper.email}): ${usersDeleted}`);

  const remainingUsers = await User.countDocuments();
  console.log(`\nDone. ${remainingUsers} user(s) remain (should be 1: ${keeper.email}).`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
