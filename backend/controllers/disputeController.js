const Dispute = require("../models/disputeModel");
const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const User = require("../models/userModel");
const { notify } = require("../utils/notify");
const { logAdminAction } = require("../utils/audit");
const { applyWalletEntry, withWalletSession } = require("../utils/walletService");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const { raiseDisputeValidation, resolveDisputeValidation } = require("../validators/disputeValidation");
const sendServerError = require("../utils/sendServerError");
const emailProvider = require("../utils/emailProvider");
const { disputeResolvedEmail } = require("../emailTemplates/templates");

// Only raisable on a completed booking, by either party — the counterparty
// (againstUser) is derived server-side, never trusted from the client, so
// it can't be spoofed to point at some other user.
const raiseDispute = async (req, res) => {
  try {
    const { error } = raiseDisputeValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const booking = await Booking.findById(req.body.bookingId);
    if (!booking || booking.status !== "completed") {
      return res.status(400).json({ success: false, msg: "You can only raise a dispute on a completed booking" });
    }

    const trip = await Trip.findById(booking.trip);
    const isShipper = String(booking.shipper) === req.auth.id;
    const isTransporter = trip && String(trip.transporter) === req.auth.id;
    if (!isShipper && !isTransporter) {
      return res.status(403).json({ success: false, msg: "Forbidden" });
    }

    const againstUser = isShipper ? trip.transporter : booking.shipper;

    let dispute;
    try {
      dispute = await Dispute.create({
        booking: booking._id,
        raisedBy: req.auth.id,
        againstUser,
        category: req.body.category,
        description: req.body.description,
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json({ success: false, msg: "You've already raised a dispute for this booking" });
      }
      throw createError;
    }

    await notify(againstUser, "dispute_raised", { disputeId: dispute._id, bookingId: booking._id });

    res.status(201).json({ success: true, msg: "Dispute submitted — our team will review it", dispute });
  } catch (error) {
    sendServerError(res, error, "disputeController");
  }
};

// Both directions — a dispute raised by this user, and one raised against
// them (e.g. a transporter accused of a no-show has no other way to see
// it, short of the one-time "dispute_raised" notification).
const listMyDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({ $or: [{ raisedBy: req.auth.id }, { againstUser: req.auth.id }] })
      .populate("booking", "goodsDescription status")
      .populate("raisedBy", "name")
      .populate("againstUser", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, disputes });
  } catch (error) {
    sendServerError(res, error, "disputeController");
  }
};

// Admin's browse-all view — read, so left open to any admin scope (only
// resolveDispute below is support-scoped), paginated per utils/paginate.js.
const listAllDisputes = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const [items, total] = await Promise.all([
      Dispute.find(filter)
        .populate("raisedBy", "name email mobile")
        .populate("againstUser", "name email mobile")
        .populate("booking", "goodsDescription status priceEstimate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "disputeController");
  }
};

// Loads a fresh copy for the 404-vs-400 distinction after an atomic claim
// misses — same pattern as adminWalletController's describeMissedClaim.
const describeMissedClaim = async (id) => {
  const existing = await Dispute.findById(id);
  if (!existing) return { status: 404, msg: "Dispute not found" };
  return { status: 400, msg: `Dispute is already ${existing.status}` };
};

// requireAdminScope("support"). The open/under_review -> resolved/rejected
// transition is claimed atomically (findOneAndUpdate inside the same
// transaction as the wallet credit) so two concurrent resolve calls on the
// same dispute — a double-click, or two support-scoped admins — can't both
// pass the "not already resolved?" check and both credit the beneficiary.
// A refund/payout resolution moves money through the same wallet-session
// pattern already proven in adminWalletController.adjustWallet — a straight
// credit, audit-logged and linked back to this dispute, same "admin can
// override but it's on the record" contract (no paired debit anywhere, by
// the same design as wallet.adjust elsewhere in this codebase).
const resolveDispute = async (req, res) => {
  try {
    const { error } = resolveDisputeValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { status, resolutionAction, resolutionAmount, resolutionNote } = req.body;

    const dispute = await withWalletSession(async (session) => {
      const claimed = await Dispute.findOneAndUpdate(
        { _id: req.params.id, status: { $nin: ["resolved", "rejected"] } },
        {
          $set: {
            status,
            resolutionAction,
            resolutionAmount,
            resolutionNote,
            resolvedBy: req.auth.id,
            resolvedAt: new Date(),
          },
        },
        { new: true, session }
      ).populate("booking");
      if (!claimed) return null;

      let beneficiary;
      if (resolutionAction === "refund_shipper") {
        beneficiary = claimed.booking.shipper;
      } else if (resolutionAction === "payout_transporter") {
        const trip = await Trip.findById(claimed.booking.trip).select("transporter").session(session);
        beneficiary = trip?.transporter;
      }

      if (beneficiary) {
        await applyWalletEntry({
          walletFilter: { ownerType: "user", user: beneficiary },
          amount: resolutionAmount,
          direction: "credit",
          type: "dispute_resolution",
          booking: claimed.booking._id,
          dispute: claimed._id,
          note: resolutionNote,
          createdBy: req.auth.id,
          session,
        });
      }

      return claimed;
    });

    if (!dispute) {
      const missed = await describeMissedClaim(req.params.id);
      return res.status(missed.status).json({ success: false, msg: missed.msg });
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "dispute.resolve",
      targetType: "Dispute",
      targetId: dispute._id,
      after: { status: dispute.status, resolutionAction, resolutionAmount },
      reason: resolutionNote,
      scope: req.auth.adminScope,
    });

    await notify(dispute.raisedBy, "dispute_resolved", { disputeId: dispute._id, status: dispute.status });
    await notify(dispute.againstUser, "dispute_resolved", { disputeId: dispute._id, status: dispute.status });

    const parties = await User.find({ _id: { $in: [dispute.raisedBy, dispute.againstUser] } }).select("name email");
    for (const party of parties) {
      if (!party.email) continue;
      const { subject, html } = disputeResolvedEmail({
        name: party.name,
        category: dispute.category,
        status: dispute.status,
        resolutionNote: dispute.resolutionNote,
      });
      emailProvider.sendEmail({ to: party.email, subject, html }).catch((err) => console.error("dispute resolved email failed:", err.message));
    }

    res.status(200).json({ success: true, msg: "Dispute resolved", dispute });
  } catch (error) {
    sendServerError(res, error, "disputeController");
  }
};

module.exports = { raiseDispute, listMyDisputes, listAllDisputes, resolveDispute };
