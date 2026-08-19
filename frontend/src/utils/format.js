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

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatTons = (value) =>
  `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} t`;

// Value for <input type="date">, in the browser's local time.
export const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// PostTrip/ManageTrip only collect a departure/arrival DATE now (no
// time-of-day picker) — these bake in a sensible fixed time so
// departureAt/estimatedArrivalAt still land as real, correctly-ordered
// datetimes for the backend (the search window, the T-24h reminder, and
// the departure-passed expiry sweep all key off the actual instant, not
// just the calendar date).
const DEFAULT_DEPARTURE_HOUR = 9;
const DEFAULT_ARRIVAL_HOUR = 18;

// Picking "today" for departure could otherwise land on 9am earlier today —
// falls back to a couple of hours from now so it's always still valid.
export const buildDepartureAt = (dateStr) => {
  const picked = new Date(`${dateStr}T00:00:00`);
  picked.setHours(DEFAULT_DEPARTURE_HOUR, 0, 0, 0);
  const now = new Date();
  return picked > now ? picked : new Date(now.getTime() + 2 * 60 * 60 * 1000);
};

// 6pm same-day is always after the 9am (or later, per the fallback above)
// departure it's paired with — same-day short-haul arrivals just work
// without needing to special-case "same date picked for both."
export const buildEstimatedArrivalAt = (dateStr, departureAt) => {
  if (!dateStr) return undefined;
  const picked = new Date(`${dateStr}T00:00:00`);
  picked.setHours(DEFAULT_ARRIVAL_HOUR, 0, 0, 0);
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
