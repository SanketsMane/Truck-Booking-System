const Notification = require("../models/notificationModel");
const sendServerError = require("../utils/sendServerError");
const { CATEGORY_LABELS } = require("../config/notificationCategories");
const { emitToUser } = require("../realtime/io");

// So the profile preferences UI always matches exactly what notify() checks
// against, rather than a hand-copied list that can drift out of sync.
const listCategories = (req, res) => {
  res.status(200).json({ success: true, categories: CATEGORY_LABELS });
};

// FR-09.3 — in-app notification history.
const listMyNotifications = async (req, res) => {
  try {
    const filter = { user: req.auth.id };
    if (req.query.unreadOnly === "true") filter.readAt = null;

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    sendServerError(res, error, "notificationController");
  }
};

const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.auth.id },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, msg: "Notification not found" });
    }
    // Lets any OTHER open tab of this same user drop its unread count for
    // this notification too — this tab's own UI already updated from the
    // API response above, it doesn't need this echo.
    emitToUser(req.auth.id, "notification:read", { notificationId: notification._id });
    res.status(200).json({ success: true, notification });
  } catch (error) {
    sendServerError(res, error, "notificationController");
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.auth.id, readAt: null }, { readAt: new Date() });
    // Same cross-tab sync as markRead above, for the "mark all" action.
    emitToUser(req.auth.id, "notification:allRead", {});
    res.status(200).json({ success: true, msg: "All notifications marked as read" });
  } catch (error) {
    sendServerError(res, error, "notificationController");
  }
};

module.exports = { listMyNotifications, markRead, markAllRead, listCategories };
