// Maps each notify() event type to a user-facing category so profile
// preferences (FR-09.3) toggle a handful of groups, not 14 individual
// switches. Account-status changes (ban/suspend) are deliberately left
// unmapped — that's safety-relevant and always sends regardless of
// preference, matching notify()'s "no category match -> always send" rule.
const NOTIFICATION_CATEGORIES = {
  new_booking_request: "bookings",
  booking_confirmed: "bookings",
  booking_rejected: "bookings",
  booking_expired: "bookings",
  booking_cancelled: "bookings",
  booking_pickup_confirmed: "bookings",
  booking_completed: "bookings",
  new_chat_message: "chat",
  verification_status_changed: "verification",
  truck_status_changed: "verification",
  new_rating: "ratings",
  rating_prompt: "ratings",
  saved_search_match: "search_alerts",
  trip_departure_reminder: "reminders",
  booking_payment_received: "payments",
  wallet_credited: "payments",
  withdrawal_approved: "payments",
  withdrawal_rejected: "payments",
  withdrawal_paid: "payments",
  dispute_raised: "disputes",
  dispute_resolved: "disputes",
};

const CATEGORY_LABELS = {
  bookings: "Booking updates",
  chat: "Chat messages",
  verification: "Verification status",
  ratings: "Ratings & reviews",
  search_alerts: "Saved search alerts",
  reminders: "Trip departure reminders",
  payments: "Wallet & payment updates",
  disputes: "Dispute updates",
};

module.exports = { NOTIFICATION_CATEGORIES, CATEGORY_LABELS };
