const Verification = require("../models/verificationModel");
const User = require("../models/userModel");
const { notify } = require("../utils/notify");
const resolveDocuments = require("../utils/resolveDocuments");
const { logAdminAction } = require("../utils/audit");
const emailProvider = require("../utils/emailProvider");
const { verificationStatusEmail } = require("../emailTemplates/templates");
const sendServerError = require("../utils/sendServerError");
const {
  submitVerificationValidation,
  reviewVerificationValidation,
} = require("../validators/verificationValidation");

// Submit or resubmit KYC for a role. Resubmission always returns the record
// to Pending (SRS-02.2), whether it previously was rejected or is being
// updated with additional documents.
const submitVerification = async (req, res) => {
  try {
    const { error } = submitVerificationValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { type, businessName, documents } = req.body;

    let resolvedDocuments;
    try {
      resolvedDocuments = await resolveDocuments(documents, req.auth.id);
    } catch (docError) {
      return res.status(400).json({ success: false, msg: docError.message });
    }

    const verification = await Verification.findOneAndUpdate(
      { user: req.auth.id, type },
      {
        $set: {
          businessName: businessName || undefined,
          documents: resolvedDocuments,
          status: "pending",
          rejectReason: undefined,
          reviewedBy: undefined,
          reviewedAt: undefined,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, msg: "Verification submitted", verification });
  } catch (error) {
    sendServerError(res, error, "verificationController");
  }
};

const getMyVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({ user: req.auth.id });
    res.status(200).json({ success: true, verifications });
  } catch (error) {
    sendServerError(res, error, "verificationController");
  }
};

// Admin queue — separate by type per FR-11.3
const listQueue = async (req, res) => {
  try {
    const { type, status = "pending" } = req.query;
    const filter = {};
    if (status !== "all") filter.status = status;
    if (type) filter.type = type;

    const verifications = await Verification.find(filter)
      .populate("user", "name mobile city")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, verifications });
  } catch (error) {
    sendServerError(res, error, "verificationController");
  }
};

const reviewVerification = async (req, res) => {
  try {
    const { error } = reviewVerificationValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const verification = await Verification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ success: false, msg: "Verification not found" });
    }

    const before = verification.status;
    verification.status = req.body.status;
    verification.rejectReason = req.body.status === "rejected" ? req.body.reason : undefined;
    verification.reviewedBy = req.auth.id;
    verification.reviewedAt = new Date();
    await verification.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "verification.review",
      targetType: "Verification",
      targetId: verification._id,
      before: { status: before },
      after: { status: verification.status },
      reason: verification.rejectReason,
      scope: req.auth.adminScope,
    });

    await notify(verification.user, "verification_status_changed", {
      type: verification.type,
      status: verification.status,
      reason: verification.rejectReason,
    });

    const user = await User.findById(verification.user).select("name email");
    if (user?.email) {
      const { subject, html } = verificationStatusEmail({
        name: user.name,
        type: verification.type,
        status: verification.status,
        reason: verification.rejectReason,
      });
      emailProvider.sendEmail({ to: user.email, subject, html }).catch((err) => console.error("verification status email failed:", err.message));
    }

    res.status(200).json({ success: true, msg: "Verification reviewed", verification });
  } catch (error) {
    sendServerError(res, error, "verificationController");
  }
};

module.exports = { submitVerification, getMyVerifications, listQueue, reviewVerification };
