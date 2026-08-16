const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // The account identifier and sole login credential. Required+unique
    // (not sparse) — every account has exactly one email, going in.
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Optional secondary contact field — no longer used for auth or account
    // lookup. sparse so any number of accounts can leave it unset without
    // colliding on the unique index.
    mobile: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },

    // Not required at the schema level: a shell record is created on the
    // first OTP request, before the user has supplied a name. The signup
    // flow (authController.verifyOtp) enforces name presence for new users.
    name: {
      type: String,
      trim: true,
    },

    // Optional second credential — most accounts are created via mobile+OTP
    // and never set one. select:false so it's never accidentally returned
    // by a query that forgets to exclude it; call sites that genuinely need
    // it (login, change-password) opt in with .select("+passwordHash").
    passwordHash: {
      type: String,
      select: false,
    },

    passwordReset: {
      tokenHash: { type: String, select: false },
      expiresAt: { type: Date },
    },

    city: {
      type: String,
      trim: true,
    },

    profilePhoto: {
      type: String,
    },

    roles: {
      type: [String],
      enum: ["shipper", "transporter"],
      default: [],
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    // "full" is a superuser — bypasses every requireAdminScope check.
    // The other three scope an admin down to one area of the console
    // (see middleWare/middleWare.js's requireAdminScope) — granted/revoked
    // via PUT /admin/users/:id/admin-role, full-scope-only.
    adminScope: {
      type: String,
      enum: ["full", "verification", "support", "finance"],
    },

    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },

    statusReason: {
      type: String,
    },

    // Bumped on logout and on any admin status change, and embedded in every
    // issued JWT — lets authMiddleware reject a token that's been logged
    // out or banned since it was issued, without a separate blacklist store.
    sessionVersion: {
      type: Number,
      default: 0,
    },

    // Denormalized so search/profile can sort and display without an
    // aggregation on every read; kept in sync by the Rating module.
    ratingAvg: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },

    notificationPreferences: {
      type: Map,
      of: Boolean,
      default: {},
    },

    // A transporter's default withdrawal destination, saved once from
    // Profile so it doesn't have to be retyped on every withdrawal request
    // (see walletController.requestWithdrawal, which falls back to this
    // when the request body omits payoutMethod). Same shape as
    // WithdrawalRequest's payout fields, and encrypted at rest the same
    // way via utils/withdrawalCrypto.js — accountNumber/ifscCode/upiId are
    // ciphertext strings, accountHolderName/bankName stay plaintext.
    payoutMethod: {
      _id: false,
      method: { type: String, enum: ["bank", "upi"] },
      bankDetails: {
        accountHolderName: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        ifscCode: { type: String, trim: true },
        bankName: { type: String, trim: true },
      },
      upiId: { type: String, trim: true },
    },

    otp: {
      codeHash: { type: String },
      expiresAt: { type: Date },
      verifyAttempts: { type: Number, default: 0 },
      requestCount: { type: Number, default: 0 },
      requestWindowStart: { type: Date },
      lastSentAt: { type: Date },
      lockedUntil: { type: Date },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
