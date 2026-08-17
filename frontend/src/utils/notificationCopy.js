// Human-readable copy + a link target for a notification, keyed off the
// small payload the backend attaches (see backend/utils/notify.js). Shared
// between the notifications list (pages/Notifications.jsx) and the global
// live-arrival toast (context/AuthContext.jsx) so both describe the same
// event the same way. Falls back gracefully for any type/payload shape
// this hasn't been special-cased for.
export const describeNotification = (n) => {
  const p = n.payload || {};
  switch (n.type) {
    case "new_booking_request":
      return { text: "New booking request on your trip", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "booking_confirmed":
      return { text: "Your booking was confirmed", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "booking_rejected":
      return {
        text: `Your booking was rejected${p.reason ? ` — ${p.reason}` : ""}`,
        to: p.bookingId && `/bookings/${p.bookingId}`,
      };
    case "booking_expired":
      return { text: "A booking request expired", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "booking_cancelled":
      return { text: "A booking was cancelled", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "booking_pickup_confirmed":
      return { text: "Pickup was confirmed for your booking", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "booking_completed":
      return { text: "Your booking is complete", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "rating_prompt":
      return { text: "Rate how your recent trip went", to: p.bookingId && `/bookings/${p.bookingId}` };
    case "new_rating":
      return { text: `You received a ${p.stars}-star rating`, to: p.bookingId && `/bookings/${p.bookingId}` };
    case "new_chat_message":
      return { text: "New message", to: p.threadId && `/chat/${p.threadId}` };
    case "saved_search_match":
      return {
        text: `New trip found: ${p.fromCity || "?"} → ${p.toCity || "?"}`,
        to: p.tripId && `/trips/${p.tripId}`,
      };
    case "truck_status_changed":
      return { text: `Truck ${p.regNumber || ""} is now ${p.status}`.trim(), to: "/trucks" };
    case "truck_delete_request_resolved":
      return { text: `Your delete request for ${p.regNumber || "your truck"} was ${p.status}`, to: "/trucks" };
    case "truck_deleted":
      return {
        text: `Your truck ${p.regNumber || ""} was removed by an admin${p.reason ? ` — ${p.reason}` : ""}`.trim(),
        to: "/trucks",
      };
    case "verification_status_changed":
      return { text: `Your ${p.type || ""} verification is now ${p.status}`.trim(), to: "/profile" };
    case "account_status_changed":
      return { text: `Your account status changed to ${p.status}`, to: "/profile" };
    case "dispute_raised":
      return { text: "A dispute was raised on one of your bookings", to: "/disputes" };
    case "dispute_resolved":
      return { text: `Your dispute was ${p.status || "resolved"}`, to: "/disputes" };
    default:
      return { text: n.type?.replace(/_/g, " ") || "Notification", to: null };
  }
};
