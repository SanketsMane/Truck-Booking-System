const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const Payment = require("../models/paymentModel");
const { notify } = require("../utils/notify");
const sendServerError = require("../utils/sendServerError");
const razorpayProvider = require("../utils/razorpayProvider");
const { applyWalletEntry, withWalletSession, InsufficientBalanceError } = require("../utils/walletService");
const { finalizePayment, sendPaymentReceiptEmail } = require("../utils/paymentFinalizer");
const { razorpayVerifyValidation } = require("../validators/walletValidation");

// Shared ownership + state check for all three payment endpoints below —
// only the shipper who owns a confirmed-but-unpaid booking may pay for it.
// Amount is always booking.priceEstimate, never client-supplied.
const loadPayableBooking = async (req) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking || String(booking.shipper) !== req.auth.id) {
    return { error: { status: 404, msg: "Booking not found" } };
  }
  if (booking.status !== "confirmed") {
    return { error: { status: 400, msg: `Booking must be confirmed before it can be paid (currently ${booking.status})` } };
  }
  if (booking.paymentStatus === "paid") {
    return { error: { status: 400, msg: "This booking is already paid" } };
  }
  return { booking };
};

const payFromWallet = async (req, res) => {
  try {
    const { booking, error } = await loadPayableBooking(req);
    if (error) return res.status(error.status).json({ success: false, msg: error.msg });

    const result = await withWalletSession(async (session) => {
      await applyWalletEntry({
        walletFilter: { ownerType: "user", user: booking.shipper },
        amount: booking.priceEstimate,
        direction: "debit",
        type: "booking_payment",
        booking: booking._id,
        session,
      });

      const [payment] = await Payment.create(
        [
          {
            user: booking.shipper,
            booking: booking._id,
            purpose: "booking_payment",
            method: "wallet",
            amount: booking.priceEstimate,
            status: "paid",
          },
        ],
        { session }
      );

      booking.paymentStatus = "paid";
      booking.paymentMethod = "wallet";
      booking.payment = payment._id;
      booking.paidAt = new Date();
      await booking.save({ session });

      return { booking, payment };
    });

    const trip = await Trip.findById(booking.trip).select("transporter");
    if (trip) await notify(trip.transporter, "booking_payment_received", { bookingId: booking._id });
    sendPaymentReceiptEmail(result.booking, "wallet");

    res.status(200).json({ success: true, msg: "Payment successful", booking: result.booking });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return res.status(400).json({ success: false, msg: "Insufficient wallet balance — add money to your wallet or pay via Razorpay instead" });
    }
    sendServerError(res, error, "bookingPaymentController");
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const { booking, error } = await loadPayableBooking(req);
    if (error) return res.status(error.status).json({ success: false, msg: error.msg });

    const client = await razorpayProvider.getClient();
    const { config } = await razorpayProvider.getConfig();
    const amountPaise = razorpayProvider.toPaise(booking.priceEstimate);

    const order = await client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `booking_${booking._id}`,
      notes: { bookingId: String(booking._id), purpose: "booking_payment" },
    });

    await Payment.create({
      user: booking.shipper,
      booking: booking._id,
      purpose: "booking_payment",
      method: "razorpay",
      amount: booking.priceEstimate,
      status: "created",
      razorpayOrderId: order.id,
    });

    res.status(200).json({
      success: true,
      order: { orderId: order.id, amount: amountPaise, currency: "INR", keyId: config.keyId },
    });
  } catch (error) {
    if (/isn't configured yet/.test(error.message)) {
      return res.status(400).json({ success: false, msg: error.message });
    }
    sendServerError(res, error, "bookingPaymentController");
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { error: validationError, value } = razorpayVerifyValidation.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, msg: validationError.details[0].message });
    }

    const { booking, error } = await loadPayableBooking(req);
    if (error) return res.status(error.status).json({ success: false, msg: error.msg });

    const payment = await Payment.findOne({
      razorpayOrderId: value.razorpay_order_id,
      booking: booking._id,
      purpose: "booking_payment",
    });
    if (!payment) {
      return res.status(404).json({ success: false, msg: "No matching payment order found for this booking" });
    }
    if (payment.status === "paid") {
      // Idempotent — the webhook may have already confirmed this order.
      // Re-fetch rather than reusing the `booking` loaded above: that read
      // happened before this status check, so it can't reflect a payment
      // the webhook just finished finalizing moments earlier.
      const freshBooking = await Booking.findById(booking._id);
      return res.status(200).json({ success: true, msg: "Payment already confirmed", booking: freshBooking });
    }

    const { config } = await razorpayProvider.getConfig();
    const signatureValid = razorpayProvider.verifyPaymentSignature({
      orderId: value.razorpay_order_id,
      paymentId: value.razorpay_payment_id,
      signature: value.razorpay_signature,
      keySecret: config.keySecret,
    });

    if (!signatureValid) {
      payment.status = "failed";
      payment.failureReason = "Signature verification failed";
      await payment.save();
      return res.status(400).json({ success: false, msg: "Payment verification failed" });
    }

    await finalizePayment(payment, {
      razorpayPaymentId: value.razorpay_payment_id,
      razorpaySignature: value.razorpay_signature,
      verifiedVia: "checkout",
    });

    const updatedBooking = await Booking.findById(booking._id);
    res.status(200).json({ success: true, msg: "Payment successful", booking: updatedBooking });
  } catch (error) {
    sendServerError(res, error, "bookingPaymentController");
  }
};

module.exports = { payFromWallet, createRazorpayOrder, verifyRazorpayPayment };
