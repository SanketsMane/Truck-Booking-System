const AuditLog = require("../models/auditLogModel");
const User = require("../models/userModel");
const escapeRegex = require("../utils/escapeRegex");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const sendServerError = require("../utils/sendServerError");

// Every admin action (withdrawal review, user status/role changes, settings
// updates, etc.) is already written here via utils/audit.js's
// logAdminAction — this is the first read endpoint for it. Same
// list-endpoint shape as every other admin list (adminController.listUsers,
// adminWalletController.listWithdrawals): getPagination/paginatedResponse,
// Promise.all([find, countDocuments]), sort newest-first.
const listAuditLogs = async (req, res) => {
  try {
    const { action, targetType, actor, from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;

    if (actor) {
      const re = new RegExp(escapeRegex(actor), "i");
      const matchingActors = await User.find({ $or: [{ name: re }, { email: re }, { mobile: re }] }).select("_id");
      filter.actor = { $in: matchingActors.map((u) => u._id) };
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate("actor", "name email mobile").sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "auditLogController");
  }
};

module.exports = { listAuditLogs };
