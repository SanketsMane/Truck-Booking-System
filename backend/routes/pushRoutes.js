const express = require("express");

const router = express.Router();

const pushController = require("../controllers/pushController");
const authMiddleware = require("../middleWare/middleWare");

router.post("/subscribe", authMiddleware, pushController.subscribe);
router.post("/unsubscribe", authMiddleware, pushController.unsubscribe);

// Mobile app's native (FCM) push registration — see deviceTokenModel.js.
router.post("/device/register", authMiddleware, pushController.registerDevice);
router.post("/device/unregister", authMiddleware, pushController.unregisterDevice);

module.exports = router;
