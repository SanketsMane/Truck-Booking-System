const PaymentLog = require("../models/paymentLogModel");
const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const { logAdminAction } = require("../utils/audit");
const { setPaymentLogValidation } = require("../validators/paymentLogValidation");
const sendServerError = require("../utils/sendServerError");

// FR-11.7 / SRS-10.4 — no payment gateway in MVP; admin manually logs
// offline settlement status per booking for reconciliation and reporting.
const setPaymentLog = async (req, res) => {
  try {
    const { error } = setPaymentLogValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const booking = await Booking.findById(req.body.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    const before = await PaymentLog.findOne({ booking: booking._id });

    const log = await PaymentLog.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        amount: req.body.amount,
        status: req.body.status,
        loggedBy: req.auth.id,
        loggedAt: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logAdminAction({
      actor: req.auth.id,
      action: "paymentLog.set",
      targetType: "Booking",
      targetId: booking._id,
      before: before ? { status: before.status, amount: before.amount } : null,
      after: { status: log.status, amount: log.amount },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Payment status logged", log });
  } catch (error) {
    sendServerError(res, error, "paymentLogController");
  }
};

const getPaymentLogForBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    const trip = await Trip.findById(booking.trip);
    const isParty = String(booking.shipper) === req.auth.id || (trip && String(trip.transporter) === req.auth.id);
    if (!isParty && !req.auth.isAdmin) {
      return res.status(403).json({ success: false, msg: "Forbidden" });
    }

    const log = await PaymentLog.findOne({ booking: booking._id });
    res.status(200).json({ success: true, log: log || { booking: booking._id, status: "unpaid", amount: 0 } });
  } catch (error) {
    sendServerError(res, error, "paymentLogController");
  }
};

const listPaymentLogs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const logs = await PaymentLog.find(filter)
      .populate({ path: "booking", populate: { path: "trip", select: "fromCity toCity departureAt" } })
      .sort({ loggedAt: -1 });

    res.status(200).json({ success: true, logs });
  } catch (error) {
    sendServerError(res, error, "paymentLogController");
  }
};

module.exports = { setPaymentLog, getPaymentLogForBooking, listPaymentLogs };
