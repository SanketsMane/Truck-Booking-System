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

export const formatCbm = (value) =>
  `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} m³`;

// Value for <input type="date">, in the browser's local time.
export const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// Value for <input type="datetime-local">, in the browser's local time.
export const toDateTimeInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
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
