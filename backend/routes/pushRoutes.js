const express = require("express");

const router = express.Router();

const pushController = require("../controllers/pushController");
const authMiddleware = require("../middleWare/middleWare");

router.post("/subscribe", authMiddleware, pushController.subscribe);
router.post("/unsubscribe", authMiddleware, pushController.unsubscribe);

module.exports = router;
