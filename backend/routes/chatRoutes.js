const express = require("express");

const router = express.Router();

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleWare/middleWare");

// Static segments (/inbox, /booking/:id) must come before the bare
// /:threadId route below, or Express would match "inbox" as a threadId.
router.get("/inbox", authMiddleware, chatController.listInbox);
router.get("/booking/:bookingId", authMiddleware, chatController.getThreadForBooking);
router.get("/:threadId/messages", authMiddleware, chatController.listMessages);
router.post("/:threadId/messages", authMiddleware, chatController.sendMessage);
router.put("/:threadId/read", authMiddleware, chatController.markThreadRead);
router.get("/:threadId", authMiddleware, chatController.getThread);

module.exports = router;
