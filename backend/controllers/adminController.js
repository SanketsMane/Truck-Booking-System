const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const Trip = require("../models/tripModel");
const Truck = require("../models/truckModel");
const Booking = require("../models/bookingModel");
const Verification = require("../models/verificationModel");
const Notification = require("../models/notificationModel");
const PlatformSetting = require("../models/platformSettingModel");
const UploadedFile = require("../models/uploadedFileModel");
const { notify } = require("../utils/notify");
const { logAdminAction } = require("../utils/audit");
const { markBookingCancelled } = require("../utils/bookingCancellation");
const emailProvider = require("../utils/emailProvider");
const { welcomeEmail, accountStatusEmail } = require("../emailTemplates/templates");
const { toCsv } = require("../utils/csv");
const escapeRegex = require("../utils/escapeRegex");
const sendServerError = require("../utils/sendServerError");
const objectStorage = require("../utils/objectStorage");
const { refreshBrandingCache } = require("../utils/brandingCache");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const {
  setUserStatusValidation,
  forceCancelBookingValidation,
  deactivateTripValidation,
  updateSettingsValidation,
  updateBrandingValidation,
  setAdminRoleValidation,
  createUserValidation,
} = require("../validators/adminValidation");

// Same cost factor authController.js's signup/resetPassword/setPassword use
// — kept as a local constant here rather than imported from there, same
// "no shared coupling between these two controllers" call as
// adminValidation.js's own local email/password schemas.
const CREATE_USER_SALT_ROUNDS = 10;

// SRS-10.1 — headline metrics, a bookings trend chart, top routes, recent activity.
const getDashboard = async (req, res) => {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalTrips, totalBookings, activeTrucks, completedBookings, bookingsTrend, topRoutes, recentBookings, recentRegistrations] =
      await Promise.all([
        Trip.countDocuments(),
        Booking.countDocuments(),
        Truck.countDocuments({ status: "verified" }),
        Booking.countDocuments({ status: "completed" }),
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
        Booking.find()
          .populate("shipper", "name")
          .populate({ path: "trip", select: "fromCity toCity transporter", populate: { path: "transporter", select: "name" } })
          .sort({ createdAt: -1 })
          .limit(5),
        User.find().select("name email mobile roles createdAt").sort({ createdAt: -1 }).limit(5),
      ]);

    res.status(200).json({
      success: true,
      dashboard: {
        totalTrips,
        totalBookings,
        activeTrucks,
        completedBookings,
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
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (role) filter.roles = role;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: re }, { mobile: re }, { email: re }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select("-otp").sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, ...paginatedResponse(users, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// Creates a user account directly, bypassing the normal OTP signup flow —
// full-scope-only (route-gated), for cases like seeding a known contact or
// standing up another admin without them self-registering first.
// emailVerified is set true (an admin vouching for the address takes the
// place of the OTP step signup would otherwise require), and — critically
// — this must NOT call issueSession the way authController.signup does:
// that sets the *caller's* session cookie, which here would log the
// creating admin's own browser in as the brand-new user.
const createUser = async (req, res) => {
  try {
    const { error } = createUserValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { name, password, role, adminScope } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, msg: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, CREATE_USER_SALT_ROUNDS);
    const isAdmin = role === "admin";
    const created = await User.create({
      name,
      email,
      passwordHash,
      roles: isAdmin ? [] : [role],
      isAdmin,
      adminScope: isAdmin ? adminScope : undefined,
      emailVerified: true,
      status: "active",
    });

    await logAdminAction({
      actor: req.auth.id,
      action: "user.create",
      targetType: "User",
      targetId: created._id,
      before: null,
      after: { email: created.email, name: created.name, roles: created.roles, isAdmin: created.isAdmin, adminScope: created.adminScope },
      scope: req.auth.adminScope,
    });

    const { subject, html } = welcomeEmail({ name: created.name });
    emailProvider
      .sendEmail({ to: created.email, subject, html })
      .catch((err) => console.error(`Failed to send welcome email to ${created.email}:`, err.message));

    // Re-fetched (not the `created` doc directly) so the response shape
    // matches every other admin user endpoint — passwordHash/otp excluded
    // by the schema's select:false / this explicit -otp respectively,
    // rather than hand-stripping fields off the in-memory create() result.
    const user = await User.findById(created._id).select("-otp");
    res.status(201).json({ success: true, msg: "User created", user });
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

// Permanently removes a user account — full-scope-only, and only when the
// account has no booking/trip/truck history. That guard is the load-bearing
// part: this app's marketplace history depends on Booking.shipper/
// Trip.transporter/Truck.owner staying resolvable (the other party's own
// booking/trip records, ratings, and admin reports all populate through
// them), so hard-deleting a user with any of that would leave orphaned
// references and break those other users' own history. setUserStatus's
// "banned" status is the correct tool for revoking a user WITH history —
// this is for cleaning up an empty/duplicate/test account that never
// transacted, where there's nothing to preserve.
const deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.auth.id)) {
      return res.status(400).json({ success: false, msg: "You cannot delete your own account" });
    }

    const user = await User.findById(req.params.id).select("-otp");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const [bookingCount, tripCount, truckCount] = await Promise.all([
      Booking.countDocuments({ shipper: user._id }),
      Trip.countDocuments({ transporter: user._id }),
      Truck.countDocuments({ owner: user._id }),
    ]);
    if (bookingCount || tripCount || truckCount) {
      return res.status(400).json({
        success: false,
        msg: "This user has booking, trip, or truck history and can't be deleted — ban them instead to revoke access while keeping those records intact.",
      });
    }

    const before = { email: user.email, name: user.name, roles: user.roles, isAdmin: user.isAdmin, adminScope: user.adminScope };

    // No booking/trip history (just guarded above) means no chat/rating/
    // dispute/support data either — everything else in this app is
    // reached through a booking. Verification/Notification are the only
    // records genuinely owned outright by the account itself.
    await Promise.all([
      Verification.deleteMany({ user: user._id }),
      Notification.deleteMany({ user: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);

    await logAdminAction({
      actor: req.auth.id,
      action: "user.delete",
      targetType: "User",
      targetId: user._id,
      before,
      after: null,
      // Optional chaining, not req.body.reason — unlike every other
      // logAdminAction call above (all on PUT/POST routes with a required
      // body), this is a DELETE with no body required, so req.body can be
      // undefined rather than {} when the client sends no reason.
      reason: req.body?.reason,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "User deleted" });
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
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ regNumber: re }, { truckType: re }];
    }

    const [trucks, total] = await Promise.all([
      Truck.find(filter).populate("owner", "name email mobile").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Truck.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(trucks, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// FR-11.5 — search all trips, view capacity utilization.
const listTrips = async (req, res) => {
  try {
    const { search, status } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ fromCity: re }, { toCity: re }];
    }

    const [trips, total] = await Promise.all([
      Trip.find(filter)
        .populate("truck", "regNumber truckType")
        .populate("transporter", "name email mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Trip.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(trips, total, page, limit) });
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
        await markBookingCancelled(booking, {
          cancelledBy: req.auth.id,
          reason: req.body.reason,
        });
        await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
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

// FR-11.6 — search all bookings across statuses. `search` spans shipper
// name/mobile, transporter name/mobile, and the trip's cities — none of
// which live on Booking itself, so it's resolved as two ID lookups first
// (users, then trips — a trip matches on its own cities or on having a
// matching transporter) rather than an aggregation pipeline, to stay
// consistent with the plain find().populate() style every other admin list
// in this file uses.
const listBookings = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      const matchingUserIds = await User.find({ $or: [{ name: re }, { mobile: re }] }).distinct("_id");
      const matchingTripIds = await Trip.find({
        $or: [{ fromCity: re }, { toCity: re }, { transporter: { $in: matchingUserIds } }],
      }).distinct("_id");
      filter.$or = [{ goodsDescription: re }, { shipper: { $in: matchingUserIds } }, { trip: { $in: matchingTripIds } }];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("shipper", "name email mobile")
        .populate({ path: "trip", populate: { path: "transporter", select: "name email mobile" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(bookings, total, page, limit) });
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

    await markBookingCancelled(booking, { cancelledBy: req.auth.id, reason: req.body.reason });

    if (trip && wasCapacityHeld) {
      // Atomic $inc — see bookingController.cancelBooking for why a
      // read-then-write here would be a real capacity-accounting bug under
      // concurrent cancellations.
      const releaseInc = { availableCapacity: booking.capacityRequested };
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

const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSetting.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    sendServerError(res, error, "adminController");
  }
};

// A /files/:id URL's trailing segment is the UploadedFile's _id — used both
// to best-effort clean up a superseded logo/favicon and to defensively mark
// a newly-referenced file public (an admin who forgot isPublic on upload
// shouldn't end up with a broken logo).
const fileIdFromUrl = (url) => (url ? url.split("/").pop() : null);

const reclaimSupersededFile = async (oldUrl, newUrl) => {
  if (!oldUrl || oldUrl === newUrl) return;
  const oldId = fileIdFromUrl(oldUrl);
  if (!oldId) return;
  try {
    const oldFile = await UploadedFile.findById(oldId);
    if (!oldFile) return;
    await objectStorage.deleteFile(oldFile.storageKey);
    await UploadedFile.deleteOne({ _id: oldId });
  } catch (error) {
    console.error("[adminController] failed to reclaim superseded branding file:", error.message);
  }
};

const ensurePublic = async (url) => {
  const id = fileIdFromUrl(url);
  if (!id) return;
  try {
    await UploadedFile.updateOne({ _id: id, isPublic: false }, { $set: { isPublic: true } });
  } catch {
    // Not fatal — worst case the admin re-saves after fixing isPublic on
    // the original upload, or the id doesn't resolve to a real file at all
    // (a hand-crafted request), which the 404 on GET /files/:id will surface.
  }
};

// One endpoint for the whole branding concern (name + logo + favicon +
// contact email/mobile) rather than one per field — matches how the
// sms/email integration endpoints each cover several related fields under
// one save. Public read is GET /meta/branding
// (metaController.getBranding); this is the admin write side.
const updateBranding = async (req, res) => {
  try {
    const { error, value } = updateBrandingValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const settings = await PlatformSetting.getSettings();
    const before = {
      platformName: settings.platformName,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      contactEmail: settings.contactEmail,
      contactMobile: settings.contactMobile,
      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
      linkedinUrl: settings.linkedinUrl,
      youtubeUrl: settings.youtubeUrl,
    };

    await reclaimSupersededFile(settings.logoUrl, value.logoUrl);
    await reclaimSupersededFile(settings.faviconUrl, value.faviconUrl);
    if (value.logoUrl) await ensurePublic(value.logoUrl);
    if (value.faviconUrl) await ensurePublic(value.faviconUrl);

    settings.platformName = value.platformName;
    settings.logoUrl = value.logoUrl || "";
    settings.faviconUrl = value.faviconUrl || "";
    settings.contactEmail = value.contactEmail || "";
    settings.contactMobile = value.contactMobile || "";
    settings.facebookUrl = value.facebookUrl || "";
    settings.instagramUrl = value.instagramUrl || "";
    settings.linkedinUrl = value.linkedinUrl || "";
    settings.youtubeUrl = value.youtubeUrl || "";
    await settings.save();
    await refreshBrandingCache();

    await logAdminAction({
      actor: req.auth.id,
      action: "settings.branding.update",
      targetType: "PlatformSetting",
      targetId: settings._id,
      before,
      after: {
        platformName: settings.platformName,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        contactEmail: settings.contactEmail,
        contactMobile: settings.contactMobile,
        facebookUrl: settings.facebookUrl,
        instagramUrl: settings.instagramUrl,
        linkedinUrl: settings.linkedinUrl,
        youtubeUrl: settings.youtubeUrl,
      },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Branding updated", settings });
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
      .populate("shipper", "name email mobile")
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

const exportBookingsByRouteCsv = async (req, res) => {
  try {
    const rows = await Booking.aggregate([
      { $match: { status: { $in: ["confirmed", "ongoing", "completed"] } } },
      { $lookup: { from: "trips", localField: "trip", foreignField: "_id", as: "tripDoc" } },
      { $unwind: "$tripDoc" },
      {
        $group: {
          _id: { fromCity: "$tripDoc.fromCity", toCity: "$tripDoc.toCity" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { bookings: -1 } },
    ]);

    sendCsv(res, "bookings-by-route.csv", rows, [
      { label: "From", value: (r) => r._id.fromCity },
      { label: "To", value: (r) => r._id.toCity },
      { label: "Bookings", value: (r) => r.bookings },
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
      .populate("user", "name email mobile")
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
  createUser,
  getUserDetail,
  setUserStatus,
  setAdminRole,
  deleteUser,
  listTrucks,
  listTrips,
  deactivateTrip,
  listBookings,
  forceCancelBooking,
  getSettings,
  updateSettings,
  updateBranding,
  exportBookingsCsv,
  exportBookingsByRouteCsv,
  exportUserGrowthCsv,
  exportVerificationTurnaroundCsv,
};
