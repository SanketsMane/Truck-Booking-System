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
