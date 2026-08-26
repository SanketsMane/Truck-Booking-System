// Same palette as frontend/src/theme/theme.js — one brand, two clients.
export const theme = {
  color: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceRaised: "#f3f4f6",
    border: "#e5e7eb",
    borderStrong: "#d1d5db",
    text: "#111318",
    textMuted: "#4b5563",
    textFaint: "#6b7280",
    accent: "#15803d",
    accentStrong: "#166534",
    accentSoft: "rgba(21, 128, 61, 0.1)",
    onAccent: "#ffffff",
    success: "#0d9488",
    successSoft: "rgba(13, 148, 136, 0.12)",
    warning: "#c98a04",
    warningSoft: "rgba(201, 138, 4, 0.12)",
    danger: "#dc2f3c",
    dangerSoft: "rgba(220, 47, 60, 0.1)",
    info: "#2563eb",
    infoSoft: "rgba(37, 99, 235, 0.1)",
  },
  space: (n) => n * 4,
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    pill: 999,
  },
  font: {
    size: {
      xs: 12,
      sm: 13.5,
      md: 15,
      lg: 17,
      xl: 20,
      xxl: 26,
      display: 32,
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
};

export const statusColor = (status) => {
  const map = {
    pending: "warning",
    draft: "warning",
    published: "info",
    confirmed: "success",
    verified: "success",
    active: "success",
    ongoing: "info",
    full: "warning",
    completed: "success",
    rejected: "danger",
    cancelled: "danger",
    expired: "textFaint",
    inactive: "textFaint",
    candidate: "warning",
    suspended: "danger",
    banned: "danger",
  };
  return map[status] || "textMuted";
};

export default theme;
