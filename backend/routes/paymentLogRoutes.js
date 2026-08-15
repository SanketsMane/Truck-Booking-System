const express = require("express");

const router = express.Router();

const paymentLogController = require("../controllers/paymentLogController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdminScope } = require("../middleWare/middleWare");

router.get("/", authMiddleware, requireAdminScope("finance"), paymentLogController.listPaymentLogs);
router.post("/", authMiddleware, requireAdminScope("finance"), paymentLogController.setPaymentLog);
router.get("/booking/:bookingId", authMiddleware, paymentLogController.getPaymentLogForBooking);

module.exports = router;
