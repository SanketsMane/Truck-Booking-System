// Small shared formatting helpers used across the trip/booking pages so
// dates, money and ratings render identically everywhere.

export const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// hour12: false throughout this file — every departure/arrival/booking
// time is shown in 24-hour format (00:00-23:59), not 12-hour AM/PM, so a
// transporter setting a trip's time and a shipper viewing it always see
// the exact same unambiguous format.
export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
};

export const formatTons = (value) =>
  `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} t`;

// Value for <input type="date">, in the browser's local time.
export const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// PostTrip/ManageTrip collect a departure/arrival DATE plus a 24-hour
// time-of-day (<input type="time">, always "HH:MM" regardless of how a
// browser's native picker widget renders it — the value attribute's format
// is fixed by the HTML spec, not locale). Sensible defaults (9am/6pm) only
// matter for pre-filling those time fields now; combining is just the two
// values into one real instant.
export const DEFAULT_DEPARTURE_TIME = "09:00";
export const DEFAULT_ARRIVAL_TIME = "18:00";

// Value for <input type="time"> — pulls the 24-hour "HH:MM" out of an
// existing datetime (e.g. an already-posted trip being edited), or hands
// back the given default when there's nothing to pull from yet.
export const toTimeInputValue = (value, fallback = DEFAULT_DEPARTURE_TIME) => {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Pure combiner — a <input type="date"> value ("YYYY-MM-DD") and <input
// type="time"> value ("HH:MM") into one real Date instant. No "must be in
// the future"/"must be after X" correction here; buildDepartureAt and
// buildEstimatedArrivalAt below each apply their own distinct version of
// that, same as this file always has.
const combineDateAndTime = (dateStr, timeStr, fallback) => new Date(`${dateStr}T${timeStr || fallback}:00`);

// Picking "today" with an already-past time could otherwise land in the
// past — falls back to a couple of hours from now so it's always valid.
export const buildDepartureAt = (dateStr, timeStr) => {
  const picked = combineDateAndTime(dateStr, timeStr, DEFAULT_DEPARTURE_TIME);
  const now = new Date();
  return picked > now ? picked : new Date(now.getTime() + 2 * 60 * 60 * 1000);
};

// Any arrival at or before its own departure is meaningless — pushes to an
// hour after departure instead, rather than accepting a same-instant or
// backwards "arrival."
export const buildEstimatedArrivalAt = (dateStr, timeStr, departureAt) => {
  if (!dateStr) return undefined;
  const picked = combineDateAndTime(dateStr, timeStr, DEFAULT_ARRIVAL_TIME);
  return picked > departureAt ? picked : new Date(departureAt.getTime() + 60 * 60 * 1000);
};

// A pickup/drop point is always {address, lat, lng} in current data, but
// trips/bookings created before that shape existed still have it stored as
// a plain string — normalize either shape so callers can always trust
// point.address without an extra guard at every call site.
export const normalizePoint = (point) => {
  if (typeof point === "string") return { address: point, lat: null, lng: null };
  return point || { address: "", lat: null, lng: null };
};

export const ratingLabel = (avg, count) => {
  if (!count) return "New";
  return `★ ${Number(avg).toFixed(1)} (${count})`;
};

// Relative "x minutes/hours/days ago" for notification-style feeds; falls
// back to a plain date once it's more than a week old.
export const formatRelative = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(value);
};
