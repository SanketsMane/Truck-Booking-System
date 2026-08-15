const User = require("../models/userModel");
const Trip = require("../models/tripModel");
const Truck = require("../models/truckModel");
const Booking = require("../models/bookingModel");
const Verification = require("../models/verificationModel");
const PlatformSetting = require("../models/platformSettingModel");
const { notify } = require("../utils/notify");
const { logAdminAction } = require("../utils/audit");
const { cancelBookingWithRefund } = require("../utils/bookingCancellation");
const emailProvider = require("../utils/emailProvider");
const { accountStatusEmail } = require("../emailTemplates/templates");
const { toCsv } = require("../utils/csv");
const escapeRegex = require("../utils/escapeRegex");
const sendServerError = require("../utils/sendServerError");
const {
  setUserStatusValidation,
  forceCancelBookingValidation,
  deactivateTripValidation,
  updateSettingsValidation,
  updateCommissionValidation,
  setAdminRoleValidation,
} = require("../validators/adminValidation");

// SRS-10.1 — headline metrics, a bookings trend chart, top routes, recent activity.
const getDashboard = async (req, res) => {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalTrips, totalBookings, activeTrucks, revenueAgg, bookingsTrend, topRoutes, recentBookings, recentRegistrations] =
      await Promise.all([
        Trip.countDocuments(),
        Booking.countDocuments(),
        Truck.countDocuments({ status: "verified" }),
        Booking.aggregate([
          { $match: { status: { $in: ["confirmed", "ongoing", "completed"] } } },
          { $group: { _id: null, total: { $sum: "$priceEstimate" } } },
        ]),
        Booking.aggregate([
          { $match: { createdAt: { $gte: since30d } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Booking.aggregate([
          { $lookup: { from: "trips", localField: "trip", foreignField: "_id", as: "tripDoc" } },
          { $unwind: "$tripDoc" },
          { $group: { _id: { fromCity: "$tripDoc.fromCity", toCity: "$tripDoc.toCity" }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 6 },
          { $project: { _id: 0, fromCity: "$_id.fromCity", toCity: "$_id.toCity", count: 1 } },
        ]),
        Booking.find().populate("shipper", "name").sort({ createdAt: -1 }).limit(5),
        User.find().select("name mobile roles createdAt").sort({ createdAt: -1 }).limit(5),
      ]);

    res.status(200).json({
      success: true,
      dashboard: {
        totalTrips,
        totalBookings,
        activeTrucks,
        revenueIndicator: revenueAgg[0]?.total || 0,
        bookingsTrend,
        topRoutes,
        recentBookings,
        recentRegistrations,
      },
    });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.2 — search/filter all users.
const listUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};
    if (role) filter.roles = role;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: re }, { mobile: re }, { email: re }];
    }

    const users = await User.find(filter).select("-otp").sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, users });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-otp");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const [verifications, trucks, bookingsAsShipper, tripsAsTransporter] = await Promise.all([
      Verification.find({ user: user._id }),
      Truck.find({ owner: user._id }),
      Booking.find({ shipper: user._id }).sort({ createdAt: -1 }).limit(20),
      Trip.find({ transporter: user._id }).sort({ createdAt: -1 }).limit(20),
    ]);

    res.status(200).json({ success: true, user, verifications, trucks, bookingsAsShipper, tripsAsTransporter });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.2 — suspend or ban a user, reason logged.
const setUserStatus = async (req, res) => {
  try {
    const { error } = setUserStatusValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const user = await User.findById(req.params.id).select("-otp");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const before = user.status;
    user.status = req.body.status;
    user.statusReason = req.body.reason;
    // Invalidate any session issued before this change — otherwise a
    // suspended/banned user's existing cookie keeps working until it
    // naturally expires, and a later reactivation wouldn't need this, but
    // cheap enough to always do.
    user.sessionVersion += 1;
    await user.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "user.setStatus",
      targetType: "User",
      targetId: user._id,
      before: { status: before },
      after: { status: user.status },
      reason: req.body.reason,
      scope: req.auth.adminScope,
    });

    await notify(user._id, "account_status_changed", { status: user.status, reason: user.statusReason });

    // May be the only channel a suspended/banned user can still receive —
    // they can no longer log in to see an in-app notification.
    if (user.email) {
      const { subject, html } = accountStatusEmail({ name: user.name, status: user.status, reason: user.statusReason });
      emailProvider.sendEmail({ to: user.email, subject, html }).catch((err) => console.error("account status email failed:", err.message));
    }

    res.status(200).json({ success: true, msg: "User status updated", user });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// SRS-10.6 — grant/revoke scoped admin access. full-scope-only (route-gated);
// blocks self-modification so a full admin can't accidentally lock
// themselves (or the only full admin) out of the console.
const setAdminRole = async (req, res) => {
  try {
    const { error } = setAdminRoleValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    if (String(req.params.id) === String(req.auth.id)) {
      return res.status(400).json({ success: false, msg: "You cannot change your own admin access" });
    }

    const user = await User.findById(req.params.id).select("-otp");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const before = { isAdmin: user.isAdmin, adminScope: user.adminScope };
    user.isAdmin = req.body.isAdmin;
    user.adminScope = req.body.isAdmin ? req.body.adminScope : undefined;
    // Bumped so a demoted/revoked admin's existing session can't keep using
    // admin-only routes until the JWT's natural expiry — same rationale as
    // setUserStatus above.
    user.sessionVersion += 1;
    await user.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "user.setAdminRole",
      targetType: "User",
      targetId: user._id,
      before,
      after: { isAdmin: user.isAdmin, adminScope: user.adminScope },
      reason: req.body.reason,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Admin access updated", user });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// Fleet overview for the live-tracking admin page — any trip that's
// reported a GPS ping recently, regardless of its own Trip.status (which,
// unlike Booking.status, never actually transitions to "ongoing" in this
// codebase — see tripLocationController.js).
const LIVE_WINDOW_MINUTES = 5;

const listLiveTrips = async (req, res) => {
  try {
    const since = new Date(Date.now() - LIVE_WINDOW_MINUTES * 60 * 1000);
    const trips = await Trip.find({ "currentLocation.updatedAt": { $gte: since } })
      .populate("transporter", "name mobile")
      .populate("truck", "regNumber truckType")
      .sort({ "currentLocation.updatedAt": -1 });

    res.status(200).json({ success: true, trips });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.4 — list/search all registered trucks, their verification status,
// and owning transporter. Distinct from truckController.listQueue (which is
// pending-first, verification-workflow-focused) — this is a general
// oversight/browse view, same convention as listUsers/listTrips/listBookings.
const listTrucks = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ regNumber: re }, { truckType: re }];
    }

    const trucks = await Truck.find(filter).populate("owner", "name mobile").sort({ createdAt: -1 }).limit(100);

    res.status(200).json({ success: true, trucks });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.5 — search all trips, view capacity utilization.
const listTrips = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ fromCity: re }, { toCity: re }];
    }

    const trips = await Trip.find(filter)
      .populate("truck", "regNumber truckType")
      .populate("transporter", "name mobile")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, trips });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.5 — deactivate a trip; cascades to its pending/confirmed bookings
// same as a transporter-initiated cancel (SRS-03.5), refunding any that
// were paid, audit-logged. A booking already "ongoing" (in transit) blocks
// deactivation the same way it blocks a transporter's own cancelTrip — use
// forceCancelBooking on that specific booking first if it truly must stop.
const deactivateTrip = async (req, res) => {
  try {
    const { error } = deactivateTripValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }
    if (["completed", "cancelled"].includes(trip.status)) {
      return res.status(400).json({ success: false, msg: `Trip is already ${trip.status}` });
    }

    const ongoingCount = await Booking.countDocuments({ trip: trip._id, status: "ongoing" });
    if (ongoingCount > 0) {
      return res.status(400).json({
        success: false,
        msg: "This trip has goods already picked up and in transit — force-cancel the specific booking instead if it must stop",
      });
    }

    const before = trip.status;
    trip.status = "cancelled";
    await trip.save();

    const affectedBookings = await Booking.find({ trip: trip._id, status: { $in: ["pending", "confirmed"] } });
    await Promise.all(
      affectedBookings.map(async (booking) => {
        const { wasPaid } = await cancelBookingWithRefund(booking, {
          cancelledBy: req.auth.id,
          reason: req.body.reason,
        });
        await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
        if (wasPaid) {
          await notify(booking.shipper, "wallet_credited", {
            bookingId: booking._id,
            amount: booking.priceEstimate,
            reason: "refund",
          });
        }
      })
    );

    await logAdminAction({
      actor: req.auth.id,
      action: "trip.deactivate",
      targetType: "Trip",
      targetId: trip._id,
      before: { status: before },
      after: { status: trip.status },
      reason: req.body.reason,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Trip deactivated", trip });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.6 — search all bookings across statuses.
const listBookings = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("shipper", "name mobile")
      .populate({ path: "trip", populate: { path: "transporter", select: "name mobile" } })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.6 — force-cancel a booking, bypassing the normal party/window
// checks; releases capacity, notifies both parties, audit-logged.
const forceCancelBooking = async (req, res) => {
  try {
    const { error } = forceCancelBookingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }
    if (["cancelled", "rejected", "expired", "completed"].includes(booking.status)) {
      return res.status(400).json({ success: false, msg: `Booking is already ${booking.status}` });
    }

    const trip = await Trip.findById(booking.trip);
    const before = booking.status;
    const wasCapacityHeld = ["confirmed", "ongoing"].includes(booking.status);

    const { wasPaid } = await cancelBookingWithRefund(booking, { cancelledBy: req.auth.id, reason: req.body.reason });

    if (trip && wasCapacityHeld) {
      // Atomic $inc — see bookingController.cancelBooking for why a
      // read-then-write here would be a real capacity-accounting bug under
      // concurrent cancellations.
      const releaseInc = { availableCapacity: booking.capacityRequested };
      if (trip.availableVolumeCbm != null && booking.volumeRequested) {
        releaseInc.availableVolumeCbm = booking.volumeRequested;
      }
      const updatedTrip = await Trip.findOneAndUpdate(
        { _id: trip._id },
        { $inc: releaseInc },
        { new: true }
      );
      if (updatedTrip && updatedTrip.status === "full") {
        updatedTrip.status = "published";
        await updatedTrip.save();
      }
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "booking.forceCancel",
      targetType: "Booking",
      targetId: booking._id,
      before: { status: before },
      after: { status: booking.status },
      reason: req.body.reason,
      scope: req.auth.adminScope,
    });

    await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id });
    if (trip) await notify(trip.transporter, "booking_cancelled", { bookingId: booking._id });
    if (wasPaid) {
      await notify(booking.shipper, "wallet_credited", {
        bookingId: booking._id,
        amount: booking.priceEstimate,
        reason: "refund",
      });
    }

    res.status(200).json({ success: true, msg: "Booking force-cancelled", booking });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// SRS-02.3 — admin-level toggle for the verification hard gate.
const updateSettings = async (req, res) => {
  try {
    const { error } = updateSettingsValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const settings = await PlatformSetting.getSettings();
    const before = settings.verificationGateEnabled;
    settings.verificationGateEnabled = req.body.verificationGateEnabled;
    await settings.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "settings.update",
      targetType: "PlatformSetting",
      targetId: settings._id,
      before: { verificationGateEnabled: before },
      after: { verificationGateEnabled: settings.verificationGateEnabled },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Settings updated", settings });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// A dedicated endpoint rather than folding into updateSettings above —
// that one's contract is exactly {verificationGateEnabled}; a separate
// endpoint per settings concern (same split already used for the SMS/email
// integration endpoints) avoids loosening an existing, working contract.
const updateCommission = async (req, res) => {
  try {
    const { error } = updateCommissionValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const settings = await PlatformSetting.getSettings();
    const before = settings.commissionPercent;
    settings.commissionPercent = req.body.commissionPercent;
    await settings.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "settings.commission.update",
      targetType: "PlatformSetting",
      targetId: settings._id,
      before: { commissionPercent: before },
      after: { commissionPercent: settings.commissionPercent },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Commission rate updated", settings });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSetting.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

const sendCsv = (res, filename, rows, columns) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(toCsv(rows, columns));
};

// FR-11.8 / SRS-10.5 — exportable CSV reports.
const exportBookingsCsv = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("shipper", "name mobile")
      .populate({ path: "trip", populate: { path: "transporter", select: "name" } })
      .sort({ createdAt: -1 });

    sendCsv(res, "bookings.csv", bookings, [
      { label: "Booking ID", value: (b) => b._id },
      { label: "Status", value: (b) => b.status },
      { label: "Shipper", value: (b) => b.shipper?.name },
      { label: "Transporter", value: (b) => b.trip?.transporter?.name },
      { label: "Route", value: (b) => (b.trip ? `${b.trip.fromCity} -> ${b.trip.toCity}` : "") },
      { label: "Capacity (tons)", value: (b) => b.capacityRequested },
      { label: "Price Estimate", value: (b) => b.priceEstimate },
      { label: "Created At", value: (b) => b.createdAt.toISOString() },
    ]);
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

const exportRevenueByRouteCsv = async (req, res) => {
  try {
    const rows = await Booking.aggregate([
      { $match: { status: { $in: ["confirmed", "ongoing", "completed"] } } },
      { $lookup: { from: "trips", localField: "trip", foreignField: "_id", as: "tripDoc" } },
      { $unwind: "$tripDoc" },
      {
        $group: {
          _id: { fromCity: "$tripDoc.fromCity", toCity: "$tripDoc.toCity" },
          bookings: { $sum: 1 },
          revenue: { $sum: "$priceEstimate" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    sendCsv(res, "revenue-by-route.csv", rows, [
      { label: "From", value: (r) => r._id.fromCity },
      { label: "To", value: (r) => r._id.toCity },
      { label: "Bookings", value: (r) => r.bookings },
      { label: "Revenue", value: (r) => r.revenue },
    ]);
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

const exportUserGrowthCsv = async (req, res) => {
  try {
    const rows = await User.aggregate([
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    sendCsv(res, "user-growth.csv", rows, [
      { label: "Date", value: (r) => r._id },
      { label: "New Users", value: (r) => r.count },
    ]);
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

const exportVerificationTurnaroundCsv = async (req, res) => {
  try {
    const verifications = await Verification.find({ status: { $ne: "pending" } })
      .populate("user", "name mobile")
      .sort({ reviewedAt: -1 });

    sendCsv(res, "verification-turnaround.csv", verifications, [
      { label: "User", value: (v) => v.user?.name },
      { label: "Type", value: (v) => v.type },
      { label: "Status", value: (v) => v.status },
      { label: "Submitted At", value: (v) => v.createdAt.toISOString() },
      { label: "Reviewed At", value: (v) => v.reviewedAt?.toISOString() },
      {
        label: "Turnaround (hours)",
        value: (v) => (v.reviewedAt ? Math.round((v.reviewedAt - v.createdAt) / 36e5) : ""),
      },
    ]);
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

module.exports = {
  getDashboard,
  listUsers,
  getUserDetail,
  setUserStatus,
  setAdminRole,
  listLiveTrips,
  listTrucks,
  listTrips,
  deactivateTrip,
  listBookings,
  forceCancelBooking,
  getSettings,
  updateSettings,
  updateCommission,
  exportBookingsCsv,
  exportRevenueByRouteCsv,
  exportUserGrowthCsv,
  exportVerificationTurnaroundCsv,
};
