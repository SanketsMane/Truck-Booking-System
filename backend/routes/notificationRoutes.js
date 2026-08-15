const express = require("express");

const router = express.Router();

const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleWare/middleWare");

router.get("/categories", authMiddleware, notificationController.listCategories);
router.get("/me", authMiddleware, notificationController.listMyNotifications);
router.put("/read-all", authMiddleware, notificationController.markAllRead);
router.put("/:id/read", authMiddleware, notificationController.markRead);

module.exports = router;
