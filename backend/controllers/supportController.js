const SupportRequest = require("../models/supportRequestModel");
const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const { createSupportRequestValidation } = require("../validators/supportValidation");
const sendServerError = require("../utils/sendServerError");

const createSupportRequest = async (req, res) => {
  try {
    const { error } = createSupportRequestValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    if (req.body.bookingId) {
      // The Joi schema only checks this looks like an ObjectId — without
      // this, any authenticated user could attach any other user's booking
      // as context on their own ticket. Either side of the booking (the
      // shipper or the trip's transporter) is a legitimate requester.
      const booking = await Booking.findById(req.body.bookingId).select("shipper trip");
      if (!booking) {
        return res.status(404).json({ success: false, msg: "Booking not found" });
      }
      const isShipper = String(booking.shipper) === req.auth.id;
      if (!isShipper) {
        const isTransporter = await Trip.exists({ _id: booking.trip, transporter: req.auth.id });
        if (!isTransporter) {
          return res.status(404).json({ success: false, msg: "Booking not found" });
        }
      }
    }

    const request = await SupportRequest.create({
      user: req.auth.id,
      booking: req.body.bookingId,
      subject: req.body.subject,
      message: req.body.message,
    });

    res.status(201).json({ success: true, msg: "Support request submitted", request });
  } catch (error) {
    sendServerError(res, error, "supportController");
  }
};

const listMySupportRequests = async (req, res) => {
  try {
    const requests = await SupportRequest.find({ user: req.auth.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    sendServerError(res, error, "supportController");
  }
};

// FR-11.9 — admin's basic view of support requests, tied to a user/booking.
const listAllSupportRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const requests = await SupportRequest.find(filter)
      .populate("user", "name mobile")
      .populate("booking", "goodsDescription status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    sendServerError(res, error, "supportController");
  }
};

const resolveSupportRequest = async (req, res) => {
  try {
    const request = await SupportRequest.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
    if (!request) {
      return res.status(404).json({ success: false, msg: "Support request not found" });
    }
    res.status(200).json({ success: true, msg: "Marked resolved", request });
  } catch (error) {
    sendServerError(res, error, "supportController");
  }
};

module.exports = { createSupportRequest, listMySupportRequests, listAllSupportRequests, resolveSupportRequest };
