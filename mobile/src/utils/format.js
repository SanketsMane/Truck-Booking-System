export const formatINR = (amount) =>
  amount == null ? "—" : `₹${Number(amount).toLocaleString("en-IN")}`;

export const formatTons = (value) => (value == null ? "—" : `${value} T`);

export const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  return d;
};

// Departure time on its own — a search result needs "06:30" far more than it
// needs the full date, which is already in the screen header.
export const formatTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// Short date for a list row: "28 Aug", no year. The year only earns its space
// when a result is genuinely far out, which a freight search rarely is.
export const formatShortDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// A transporter with no ratings yet is "New", not "0.0" — showing a zero
// score for someone who simply hasn't been rated reads as a bad score and
// quietly penalises every new transporter on the platform.
export const ratingLabel = (avg, count) => {
  if (!count) return "New";
  return `${Number(avg).toFixed(1)} (${count})`;
};
