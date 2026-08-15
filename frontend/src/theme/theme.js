// Design tokens for ShareTruck — light theme, black text on white with a
// trucking-orange (safety/signal) accent, card-based layouts (SRS §5.7).
// Single theme by design: one visual language, not a light/dark toggle.
export const theme = {
  color: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceRaised: "#f5f5f3",
    border: "#e8e8e5",
    borderStrong: "#d6d6d1",
    text: "#14150f",
    textMuted: "#63645a",
    textFaint: "#9b9c91",

    accent: "#ff6a1a",
    accentStrong: "#e2540a",
    accentSoft: "rgba(255, 106, 26, 0.12)",
    onAccent: "#ffffff",

    success: "#16a34a",
    successSoft: "rgba(22, 163, 74, 0.12)",
    warning: "#c98a04",
    warningSoft: "rgba(201, 138, 4, 0.12)",
    danger: "#dc2f3c",
    dangerSoft: "rgba(220, 47, 60, 0.1)",
    info: "#2563eb",
    infoSoft: "rgba(37, 99, 235, 0.1)",
  },

  status: {
    // Booking / trip / verification status -> semantic color key
    pending: "warning",
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
    suspended: "danger",
    banned: "danger",
    paid: "success",
    partial: "warning",
    unpaid: "danger",
    approved: "info",
    created: "warning",
    failed: "danger",
    refunded: "info",
  },

  font: {
    family:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },

  radius: {
    sm: "10px",
    md: "16px",
    lg: "22px",
    pill: "999px",
  },

  space: (n) => `${n * 4}px`,

  shadow: {
    card: "0 1px 2px rgba(20,21,15,0.04), 0 8px 20px rgba(20,21,15,0.06)",
    raised: "0 4px 10px rgba(20,21,15,0.06), 0 16px 32px rgba(20,21,15,0.08)",
    popover: "0 8px 16px rgba(20,21,15,0.08), 0 24px 48px rgba(20,21,15,0.14)",
    accentGlow: "0 6px 16px rgba(255,106,26,0.28)",
  },

  breakpoint: {
    phone: "480px",
    tablet: "768px",
    desktop: "1080px",
  },
};

export default theme;
