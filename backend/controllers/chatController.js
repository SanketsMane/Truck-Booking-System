const ChatThread = require("../models/chatThreadModel");
const Message = require("../models/messageModel");
const { notify } = require("../utils/notify");
const { emitToRoom } = require("../realtime/io");
const { logAdminAction } = require("../utils/audit");
const { sendMessageValidation } = require("../validators/chatValidation");
const sendServerError = require("../utils/sendServerError");

const findThreadForParticipant = async (threadId, userId) => {
  const thread = await ChatThread.findById(threadId);
  if (!thread || !thread.participants.some((p) => String(p) === userId)) {
    return null;
  }
  return thread;
};

// FR-07.1 / SRS-06.1 — one thread per booking, reachable from booking detail.
const getThreadForBooking = async (req, res) => {
  try {
    const thread = await ChatThread.findOne({ booking: req.params.bookingId });
    if (!thread || !thread.participants.some((p) => String(p) === req.auth.id)) {
      return res.status(404).json({ success: false, msg: "Chat thread not found" });
    }
    res.status(200).json({ success: true, thread });
  } catch (error) {
    sendServerError(res, error, "chatController");
  }
};

const listMessages = async (req, res) => {
  try {
    const thread = await findThreadForParticipant(req.params.threadId, req.auth.id);
    if (!thread) {
      return res.status(404).json({ success: false, msg: "Chat thread not found" });
    }

    const messages = await Message.find({ thread: thread._id }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    sendServerError(res, error, "chatController");
  }
};

// SRS-06.2/06.3 — persisted over REST, then fanned out live to the thread
// room; FR-07.3 notifies the other participant on a new message.
const sendMessage = async (req, res) => {
  try {
    const { error } = sendMessageValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const thread = await findThreadForParticipant(req.params.threadId, req.auth.id);
    if (!thread) {
      return res.status(404).json({ success: false, msg: "Chat thread not found" });
    }

    const message = await Message.create({
      thread: thread._id,
      sender: req.auth.id,
      text: req.body.text,
    });

    thread.lastMessageAt = message.createdAt;
    await thread.save();

    emitToRoom(`thread:${thread._id}`, "chat:message", message);

    const recipient = thread.participants.find((p) => String(p) !== req.auth.id);
    if (recipient) {
      await notify(recipient, "new_chat_message", { threadId: thread._id, bookingId: thread.booking });
    }

    res.status(201).json({ success: true, msg: "Message sent", message });
  } catch (error) {
    sendServerError(res, error, "chatController");
  }
};

const markThreadRead = async (req, res) => {
  try {
    const thread = await findThreadForParticipant(req.params.threadId, req.auth.id);
    if (!thread) {
      return res.status(404).json({ success: false, msg: "Chat thread not found" });
    }

    const readAt = new Date();
    const { modifiedCount } = await Message.updateMany(
      { thread: thread._id, sender: { $ne: req.auth.id }, "readBy.user": { $ne: req.auth.id } },
      { $push: { readBy: { user: req.auth.id, readAt } } }
    );

    // SRS-06.2 — read-state indicators. Only worth telling the room about
    // if something actually flipped to read, and only the sender needs to
    // know (they're the one whose bubble should update) — but broadcasting
    // to the whole thread room is simplest and harmless, same pattern
    // sendMessage already uses.
    if (modifiedCount > 0) {
      emitToRoom(`thread:${thread._id}`, "chat:read", { threadId: thread._id, readerId: req.auth.id, readAt });
    }

    res.status(200).json({ success: true, msg: "Marked as read" });
  } catch (error) {
    sendServerError(res, error, "chatController");
  }
};

// SRS-06.1 — the spec scopes a thread to "the booking's shipper and
// transporter (and admin for moderation)". Deliberately a separate
// admin-gated route (see routes/adminRoutes.js, requireAdminScope("support")
// — same scope dispute resolution already requires) rather than an isAdmin
// bypass inside findThreadForParticipant, so the participant-only guard the
// regular chat routes rely on stays exactly as strict as it already was.
const adminGetThread = async (req, res) => {
  try {
    const thread = await ChatThread.findOne({ booking: req.params.bookingId });
    if (!thread) {
      return res.status(404).json({ success: false, msg: "Chat thread not found" });
    }

    const messages = await Message.find({ thread: thread._id }).sort({ createdAt: 1 });

    await logAdminAction({
      actor: req.auth.id,
      action: "chat.view",
      targetType: "ChatThread",
      targetId: thread._id,
      reason: undefined,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, thread, messages });
  } catch (error) {
    sendServerError(res, error, "chatController");
  }
};

module.exports = { getThreadForBooking, listMessages, sendMessage, markThreadRead, adminGetThread };
