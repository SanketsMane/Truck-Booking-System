const express = require("express");

const router = express.Router();

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleWare/middleWare");

router.get("/booking/:bookingId", authMiddleware, chatController.getThreadForBooking);
router.get("/:threadId/messages", authMiddleware, chatController.listMessages);
router.post("/:threadId/messages", authMiddleware, chatController.sendMessage);
router.put("/:threadId/read", authMiddleware, chatController.markThreadRead);

module.exports = router;
