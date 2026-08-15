const express = require("express");

const router = express.Router();

const bookingController = require("../controllers/bookingController");
const bookingPaymentController = require("../controllers/bookingPaymentController");
const authMiddleware = require("../middleWare/middleWare");
const { requireRole } = require("../middleWare/middleWare");

router.get("/me", authMiddleware, bookingController.listMyBookings);
router.post("/", authMiddleware, requireRole("shipper"), bookingController.createBooking);

router.get("/:id", authMiddleware, bookingController.getBooking);
router.put("/:id/accept", authMiddleware, requireRole("transporter"), bookingController.acceptBooking);
router.put("/:id/reject", authMiddleware, requireRole("transporter"), bookingController.rejectBooking);
router.put("/:id/cancel", authMiddleware, bookingController.cancelBooking);
router.put("/:id/confirm-pickup", authMiddleware, bookingController.confirmPickup);
router.put("/:id/confirm-drop", authMiddleware, bookingController.confirmDrop);

router.post("/:id/pay/wallet", authMiddleware, requireRole("shipper"), bookingPaymentController.payFromWallet);
router.post("/:id/pay/razorpay/order", authMiddleware, requireRole("shipper"), bookingPaymentController.createRazorpayOrder);
router.post("/:id/pay/razorpay/verify", authMiddleware, requireRole("shipper"), bookingPaymentController.verifyRazorpayPayment);

module.exports = router;
