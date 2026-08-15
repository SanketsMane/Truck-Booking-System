const Payment = require("../models/paymentModel");
const razorpayProvider = require("../utils/razorpayProvider");
const { finalizePayment } = require("../utils/paymentFinalizer");
const sendServerError = require("../utils/sendServerError");
const { DEFAULT_CURRENCY } = require("../config/marketplaceConfig");

// Server-to-server reliability backstop for the checkout-callback verify
// endpoints — a shipper who closes their browser mid-payment still gets
// credited because Razorpay retries this webhook independently of the
// client. No auth middleware: the HMAC signature over the exact raw request
// bytes (captured via server.js's express.json({verify}) callback) IS the
// authentication here, checked with a constant-time comparison.
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = await razorpayProvider.getWebhookSecret();

    if (!webhookSecret || !signature || !req.rawBody) {
      return res.status(400).json({ success: false, msg: "Webhook not configured or missing signature" });
    }

    const valid = razorpayProvider.verifyWebhookSignature({
      rawBody: req.rawBody,
      signature,
      webhookSecret,
    });
    if (!valid) {
      return res.status(400).json({ success: false, msg: "Invalid webhook signature" });
    }

    const event = req.body;
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        // Idempotent: this webhook can arrive after the checkout callback
        // already finalized the same payment (or arrive twice itself) —
        // finalizePayment's own atomic claim is what actually prevents a
        // double-credit; this check is just a fast-path.
        if (payment && payment.status !== "paid") {
          // Defense in depth: the amount/currency actually captured by
          // Razorpay must match what we recorded at order-creation time
          // before we trust it enough to move money. Razorpay reports
          // amount in paise; Payment.amount is stored in rupees.
          const expectedPaise = razorpayProvider.toPaise(payment.amount);
          const amountMatches = paymentEntity.amount === expectedPaise;
          const currencyMatches = (paymentEntity.currency || DEFAULT_CURRENCY) === DEFAULT_CURRENCY;

          if (!amountMatches || !currencyMatches) {
            console.error(
              `[webhook] amount/currency mismatch for payment ${payment._id}: expected ${expectedPaise} paise ${DEFAULT_CURRENCY}, got ${paymentEntity.amount} ${paymentEntity.currency}`
            );
          } else {
            await finalizePayment(payment, {
              razorpayPaymentId: paymentId,
              razorpaySignature: signature,
              verifiedVia: "webhook",
            });
          }
        }
      }
    }

    // Razorpay only cares that we returned 2xx — event types we don't act
    // on (order.paid, payment.failed, etc.) are acknowledged the same way.
    res.status(200).json({ success: true });
  } catch (error) {
    sendServerError(res, error, "webhookController");
  }
};

module.exports = { handleRazorpayWebhook };
