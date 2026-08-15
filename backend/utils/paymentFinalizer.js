const Payment = require("../models/paymentModel");
const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const User = require("../models/userModel");
const { applyWalletEntry, withWalletSession } = require("./walletService");
const { notify } = require("./notify");
const emailProvider = require("./emailProvider");
const { paymentReceiptEmail } = require("../emailTemplates/templates");

// Shared by both payment paths (bookingPaymentController.payFromWallet and
// finalizePayment's razorpay branch below) — a receipt email failure must
// never surface as a failure of the payment itself, which has already
// committed by the time this runs.
const sendPaymentReceiptEmail = async (booking, paymentMethod) => {
  try {
    const [trip, shipper] = await Promise.all([
      Trip.findById(booking.trip).select("fromCity toCity"),
      User.findById(booking.shipper).select("name email"),
    ]);
    if (!shipper?.email || !trip) return;

    const { subject, html } = paymentReceiptEmail({
      name: shipper.name,
      fromCity: trip.fromCity,
      toCity: trip.toCity,
      amount: booking.priceEstimate,
      paymentMethod,
      paidAt: booking.paidAt,
      bookingId: booking._id,
    });
    await emailProvider.sendEmail({ to: shipper.email, subject, html });
  } catch (err) {
    console.error("payment receipt email failed:", err.message);
  }
};

// Applies the correct side effect once a Payment is confirmed paid —
// crediting a wallet (recharge) or marking a booking paid (booking_payment).
// Shared by both checkout-callback verify endpoints AND the webhook
// handler, so all three write through the exact same logic and can never
// drift from each other.
//
// The checkout callback and the webhook can both arrive for the same
// payment within milliseconds of each other (completely normal Razorpay
// timing) — callers' own `payment.status !== "paid"` pre-checks are only a
// fast-path, NOT the safety mechanism: the actual claim happens here, via a
// single atomic `findOneAndUpdate({status: {$ne: "paid"}}, {$set: {status:
// "paid"}})`. Only the caller that wins that update proceeds to move money;
// a caller that loses it (payment already claimed by the other path)
// no-ops cleanly instead of double-crediting.
const finalizePayment = async (payment, { razorpayPaymentId, razorpaySignature, verifiedVia }) => {
  if (payment.purpose === "wallet_recharge") {
    const didFinalize = await withWalletSession(async (session) => {
      const claimed = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: "paid" } },
        { $set: { status: "paid", razorpayPaymentId, razorpaySignature, verifiedVia } },
        { new: true, session }
      );
      if (!claimed) return false;

      await applyWalletEntry({
        walletFilter: { ownerType: "user", user: claimed.user },
        amount: claimed.amount,
        direction: "credit",
        type: "recharge",
        payment: claimed._id,
        session,
      });
      return true;
    });

    if (didFinalize) {
      await notify(payment.user, "wallet_credited", { amount: payment.amount, reason: "recharge" });
    }
    return;
  }

  if (payment.purpose === "booking_payment") {
    // Payment + Booking are updated in the same transaction so a failure
    // partway through rolls both back — without this, a committed
    // Payment("paid") next to an un-committed Booking would look
    // "already handled" to every future retry (including Razorpay's own
    // webhook redelivery) and never get a second chance to finish.
    const result = await withWalletSession(async (session) => {
      const claimed = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: "paid" } },
        { $set: { status: "paid", razorpayPaymentId, razorpaySignature, verifiedVia } },
        { new: true, session }
      );
      if (!claimed) return { alreadyFinalized: true };

      const booking = await Booking.findOneAndUpdate(
        { _id: claimed.booking, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            paymentMethod: "razorpay",
            payment: claimed._id,
            paidAt: new Date(),
          },
        },
        { new: true, session }
      );
      return { booking };
    });

    if (result.booking) {
      const trip = await Trip.findById(result.booking.trip).select("transporter");
      if (trip) await notify(trip.transporter, "booking_payment_received", { bookingId: result.booking._id });
      sendPaymentReceiptEmail(result.booking, "razorpay");
    } else if (!result.alreadyFinalized) {
      console.error(
        `[finalizePayment] payment ${payment._id} claimed as paid but booking ${payment.booking} was not found or already paid`
      );
    }
  }
};

module.exports = { finalizePayment, sendPaymentReceiptEmail };
