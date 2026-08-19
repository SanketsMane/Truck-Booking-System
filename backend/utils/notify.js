const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const { emitToUser } = require("../realtime/io");
const { NOTIFICATION_CATEGORIES } = require("../config/notificationCategories");
const { sendPushToUser } = require("./webPush");
const { getBrandName } = require("./brandingCache");

// Mirrors frontend/src/pages/Notifications.jsx's describe() copy exactly,
// so a push notification's body/link matches what the in-app notification
// center shows for the same event, rather than inventing separate wording.
// Any type not special-cased here falls back the same way describe() does.
const pushCopy = (type, payload = {}) => {
  switch (type) {
    case "new_booking_request":
      return { body: "New booking request on your trip", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_confirmed":
      return { body: "Your booking was confirmed", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_rejected":
      return {
        body: `Your booking was rejected${payload.reason ? ` — ${payload.reason}` : ""}`,
        url: payload.bookingId && `/bookings/${payload.bookingId}`,
      };
    case "booking_expired":
      return { body: "A booking request expired", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_cancelled":
      return { body: "A booking was cancelled", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_pickup_confirmed":
      return { body: "Pickup was confirmed for your booking", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_completed":
      return { body: "Your booking is complete", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "rating_prompt":
      return { body: "Rate how your recent trip went", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "new_rating":
      return { body: `You received a ${payload.stars}-star rating`, url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "new_chat_message":
      return { body: "New message", url: payload.threadId && `/chat/${payload.threadId}` };
    case "saved_search_match":
      return {
        body: `New trip found: ${payload.fromCity || "?"} → ${payload.toCity || "?"}`,
        url: payload.tripId && `/trips/${payload.tripId}`,
      };
    case "truck_status_changed":
      return { body: `Truck ${payload.regNumber || ""} is now ${payload.status}`.trim(), url: "/trucks" };
    case "trip_auto_published":
      return {
        body: `Your trip ${payload.fromCity || "?"} → ${payload.toCity || "?"} is now live — its truck was just verified`,
        url: payload.tripId && `/trips/${payload.tripId}/manage`,
      };
    case "truck_delete_request_resolved":
      return { body: `Your delete request for ${payload.regNumber || "your truck"} was ${payload.status}`, url: "/trucks" };
    case "truck_deleted":
      return {
        body: `Your truck ${payload.regNumber || ""} was removed by an admin${payload.reason ? ` — ${payload.reason}` : ""}`.trim(),
        url: "/trucks",
      };
    case "verification_status_changed":
      return { body: `Your ${payload.type || ""} verification is now ${payload.status}`.trim(), url: "/profile" };
    case "account_status_changed":
      return { body: `Your account status changed to ${payload.status}`, url: "/profile" };
    case "dispute_raised":
      return { body: "A dispute was raised on one of your bookings", url: "/disputes" };
    case "dispute_resolved":
      return { body: `Your dispute was ${payload.status || "resolved"}`, url: "/disputes" };
    default:
      return { body: type?.replace(/_/g, " ") || "Notification", url: "/notifications" };
  }
};

// Central fan-out point for FR-09 event-triggered notifications. Persists
// to the in-app notification center (required channel), pushes live over
// the socket if the user is connected, and best-effort sends a web push if
// they've subscribed. SMS for OTP/booking-confirmed is sent directly by the
// calling module via otpProvider/smsProvider, not here.
//
// Always called after the caller's real state change is already saved — a
// notification failure must never surface as a failure of that action, so
// errors here are logged and swallowed rather than thrown.
const notify = async (userId, type, payload = {}) => {
  try {
    const category = NOTIFICATION_CATEGORIES[type];
    if (category) {
      const user = await User.findById(userId).select("notificationPreferences");
      if (user?.notificationPreferences?.get(category) === false) {
        return null;
      }
    }

    const notification = await Notification.create({ user: userId, type, payload });

    emitToUser(userId, "notification:new", {
      id: notification._id,
      type: notification.type,
      payload: notification.payload,
      sentAt: notification.sentAt,
    });

    // Fire-and-forget — sendPushToUser never throws, and a caller awaiting
    // notify() shouldn't also wait on push-service network latency.
    const { body, url } = pushCopy(type, payload);
    sendPushToUser(userId, { title: getBrandName(), body, url });

    return notification;
  } catch (error) {
    console.error(`notify() failed for user ${userId}, type "${type}":`, error.message);
    return null;
  }
};

module.exports = { notify };
