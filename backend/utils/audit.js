const AuditLog = require("../models/auditLogModel");

// Always called after the caller's real state change (often a money
// movement) is already saved — an audit-log write failure must never
// surface as a failure of that action, or an admin who sees a false 500
// after a withdrawal was already rejected/refunded may retry the action
// and cause a real double-refund. Errors here are logged and swallowed,
// same contract as utils/notify.js.
const logAdminAction = async ({ actor, action, targetType, targetId, before, after, reason, scope }) => {
  try {
    return await AuditLog.create({ actor, action, targetType, targetId, before, after, reason, scope });
  } catch (error) {
    console.error(`logAdminAction() failed for action "${action}" on ${targetType} ${targetId}:`, error.message);
    return null;
  }
};

module.exports = { logAdminAction };
