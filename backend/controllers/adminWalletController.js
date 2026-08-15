const Payment = require("../models/paymentModel");
const Wallet = require("../models/walletModel");
const WalletTransaction = require("../models/walletTransactionModel");
const WithdrawalRequest = require("../models/withdrawalRequestModel");
const User = require("../models/userModel");
const { applyWalletEntry, withWalletSession, InsufficientBalanceError } = require("../utils/walletService");
const { notify } = require("../utils/notify");
const { logAdminAction } = require("../utils/audit");
const emailProvider = require("../utils/emailProvider");
const { withdrawalPaidEmail } = require("../emailTemplates/templates");
const { decryptPayoutDetails } = require("../utils/withdrawalCrypto");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const sendServerError = require("../utils/sendServerError");
const {
  rejectWithdrawalValidation,
  markWithdrawalPaidValidation,
  adjustWalletValidation,
} = require("../validators/walletValidation");

// The admin-facing "all payments on this platform" table — every Razorpay
// order (recharge or booking payment) and every wallet-funded booking
// payment, indexed and paginated (see utils/paginate.js; this is the first
// paginated list endpoint in this codebase).
const listPayments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, purpose, method, userId, from, to } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;
    if (method) filter.method = method;
    if (userId) filter.user = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name mobile")
        .populate("booking", "priceEstimate status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

const getPlatformWallet = async (req, res) => {
  try {
    const wallet = await Wallet.getPlatformWallet();
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

const listPlatformWalletTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const wallet = await Wallet.getPlatformWallet();
    const filter = { wallet: wallet._id };

    const [items, total] = await Promise.all([
      WalletTransaction.find(filter)
        .populate("booking", "priceEstimate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

// Browse every user wallet — search by name/mobile handled client-side
// against the (already small, page-capped) result set is out of scope
// here; this just lists wallets sorted by balance so an admin can spot
// outliers.
const listWallets = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { ownerType: "user" };

    const [items, total] = await Promise.all([
      Wallet.find(filter).populate("user", "name mobile roles").sort({ balance: -1 }).skip(skip).limit(limit),
      Wallet.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

const listWithdrawals = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .populate("transporter", "name mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WithdrawalRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      ...paginatedResponse(items.map(decryptPayoutDetails), total, page, limit),
    });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

// Loads a fresh copy for the 404-vs-409 distinction after an atomic
// findOneAndUpdate misses — kept out of the hot path (no lock held), just
// used to build a clean error message.
const describeMissedClaim = async (id) => {
  const existing = await WithdrawalRequest.findById(id);
  if (!existing) return { status: 404, msg: "Withdrawal request not found" };
  return { status: 400, msg: `Request is already ${existing.status}` };
};

// Marks a request as reviewed/approved without moving money — lets an admin
// signal "I've checked this and I'm about to pay it" as a separate step
// from actually recording the payout reference in markWithdrawalPaid below.
// The pending->approved transition is claimed atomically so a double-click
// or a retried request can't both "win" and run this twice.
const approveWithdrawal = async (req, res) => {
  try {
    const request = await WithdrawalRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: "approved", reviewedBy: req.auth.id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!request) {
      const missed = await describeMissedClaim(req.params.id);
      return res.status(missed.status).json({ success: false, msg: missed.msg });
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "withdrawal.approve",
      targetType: "WithdrawalRequest",
      targetId: request._id,
      after: { status: "approved" },
      scope: req.auth.adminScope,
    });

    await notify(request.transporter, "withdrawal_approved", { requestId: request._id, amount: request.amount });

    res.status(200).json({ success: true, msg: "Withdrawal approved", request: decryptPayoutDetails(request) });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

// Rejects a pending OR already-approved withdrawal request and credits the
// held funds back — the debit happened at request-submission time (see
// walletController.requestWithdrawal), so this is the refund half of that.
// The status transition is claimed atomically (findOneAndUpdate inside the
// same transaction as the refund credit) so two concurrent reject calls
// can't both pass the "is this still pending/approved?" check and both
// refund the same request.
const rejectWithdrawal = async (req, res) => {
  try {
    const { error, value } = rejectWithdrawalValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const request = await withWalletSession(async (session) => {
      const claimed = await WithdrawalRequest.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ["pending", "approved"] } },
        {
          $set: {
            status: "rejected",
            adminNote: value.reason,
            reviewedBy: req.auth.id,
            reviewedAt: new Date(),
          },
        },
        { new: true, session }
      );
      if (!claimed) return null;

      await applyWalletEntry({
        walletFilter: { ownerType: "user", user: claimed.transporter },
        amount: claimed.amount,
        direction: "credit",
        type: "withdrawal_refund",
        withdrawalRequest: claimed._id,
        session,
      });

      return claimed;
    });

    if (!request) {
      const missed = await describeMissedClaim(req.params.id);
      return res.status(missed.status).json({ success: false, msg: missed.msg });
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "withdrawal.reject",
      targetType: "WithdrawalRequest",
      targetId: request._id,
      after: { status: "rejected" },
      reason: value.reason,
      scope: req.auth.adminScope,
    });

    await notify(request.transporter, "withdrawal_rejected", { requestId: request._id, amount: request.amount, reason: value.reason });

    res
      .status(200)
      .json({ success: true, msg: "Withdrawal rejected and funds returned to wallet", request: decryptPayoutDetails(request) });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

// No wallet mutation — funds already left the wallet at request time. This
// just records that the admin actually transferred the money outside the
// app (bank/UPI) and a reference for reconciliation. Atomic status claim
// for the same double-submit reason as above (recording two different
// payout references for one payout would be a confusing reconciliation bug
// even though it isn't a double money-movement).
const markWithdrawalPaid = async (req, res) => {
  try {
    const { error, value } = markWithdrawalPaidValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const request = await WithdrawalRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["pending", "approved"] } },
      {
        $set: {
          status: "paid",
          payoutReference: value.payoutReference,
          reviewedBy: req.auth.id,
          reviewedAt: new Date(),
          paidAt: new Date(),
        },
      },
      { new: true }
    );
    if (!request) {
      const missed = await describeMissedClaim(req.params.id);
      return res.status(missed.status).json({ success: false, msg: missed.msg });
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "withdrawal.markPaid",
      targetType: "WithdrawalRequest",
      targetId: request._id,
      after: { status: "paid", payoutReference: value.payoutReference },
      scope: req.auth.adminScope,
    });

    await notify(request.transporter, "withdrawal_paid", { requestId: request._id, amount: request.amount });

    const transporter = await User.findById(request.transporter).select("name email");
    if (transporter?.email) {
      const { subject, html } = withdrawalPaidEmail({
        name: transporter.name,
        amount: request.amount,
        payoutReference: request.payoutReference,
      });
      emailProvider.sendEmail({ to: transporter.email, subject, html }).catch((err) => console.error("withdrawal paid email failed:", err.message));
    }

    res.status(200).json({ success: true, msg: "Withdrawal marked as paid", request: decryptPayoutDetails(request) });
  } catch (error) {
    sendServerError(res, error, "adminWalletController");
  }
};

// Manual correction — e.g. reconciling a dispute. Always requires a reason,
// audit-logged, same "admin can override but it's on the record" pattern as
// setUserStatus/deactivateTrip elsewhere in this codebase.
const adjustWallet = async (req, res) => {
  try {
    const { error, value } = adjustWalletValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const wallet = await withWalletSession(async (session) => {
      const { wallet: updated } = await applyWalletEntry({
        walletFilter: { ownerType: "user", user: req.params.userId },
        amount: value.amount,
        direction: value.direction,
        type: "adjustment",
        note: value.reason,
        createdBy: req.auth.id,
        session,
      });
      return updated;
    });

    await logAdminAction({
      actor: req.auth.id,
      action: "wallet.adjust",
      targetType: "Wallet",
      targetId: wallet._id,
      after: { direction: value.direction, amount: value.amount, balanceAfter: wallet.balance },
      reason: value.reason,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Wallet adjusted", wallet });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return res.status(400).json({ success: false, msg: "Insufficient balance for this debit adjustment" });
    }
    sendServerError(res, error, "adminWalletController");
  }
};

module.exports = {
  listPayments,
  getPlatformWallet,
  listPlatformWalletTransactions,
  listWallets,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalPaid,
  adjustWallet,
};
