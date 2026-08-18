// Design tokens for Truckgee — light theme, black text on white with a
// confident green accent (trust/logistics-marketplace signal, and
// deliberately not the blue most competitors in this space default to),
// card-based layouts (SRS §5.7). Single theme by design: one visual
// language, not a light/dark toggle.
//
// Neutrals are a cool gray scale (not the old warm/beige-tinted grays) —
// reads crisper and less dated, and pairs cleanly with the green accent
// below.
export const theme = {
  color: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceRaised: "#f3f4f6",
    border: "#e5e7eb",
    borderStrong: "#d1d5db",
    text: "#111318",
    // 7.5:1 on white — WCAG AA.
    textMuted: "#4b5563",
    // 4.6:1 on white — WCAG AA.
    textFaint: "#6b7280",

    // accentBright is a vivid, saturated green (#22c55e, ~2.7:1 on white) —
    // for decorative-only surfaces (hero gradients, map markers,
    // illustration accents) where contrast isn't load-bearing. Any text or
    // interactive control (buttons, links, icon fills on white) must use
    // accent/accentStrong instead, which are WCAG AA-safe (4.5:1+) at the
    // same hue.
    accentBright: "#22c55e",
    accent: "#15803d",
    accentStrong: "#166534",
    accentSoft: "rgba(21, 128, 61, 0.1)",
    onAccent: "#ffffff",

    // Moved off green (see accent above) to teal, so a "Confirmed"/
    // "Verified" status badge no longer reads as the same color as every
    // brand button/link on the page — the two need to stay visually
    // distinct even though both are, loosely, "positive" colors.
    success: "#0d9488",
    successSoft: "rgba(13, 148, 136, 0.12)",
    warning: "#c98a04",
    warningSoft: "rgba(201, 138, 4, 0.12)",
    danger: "#dc2f3c",
    dangerSoft: "rgba(220, 47, 60, 0.1)",
    // Unchanged — blue now reads as "informational/in-progress" rather
    // than brand, which is the conventional meaning anyway.
    info: "#2563eb",
    infoSoft: "rgba(37, 99, 235, 0.1)",

    // Landing-page brand palette (client design brief) — additive, kept
    // separate from accent/text/etc. above rather than repointing those,
    // since accent is load-bearing everywhere (buttons, links, focus
    // rings) and repointing it would reskin the whole app, not just the
    // landing page. navy/orange are used for the hero heading split and
    // section accents; lightBlue for section backgrounds; statsGreen only
    // for the hero stats card's third figure (kept distinct from the
    // semantic `success` token above, which drives status badges
    // everywhere and shouldn't be tied to one card's one-off color choice).
    navy: "#0b2a5b",
    orange: "#f26b21",
    orangeSoft: "rgba(242, 107, 33, 0.12)",
    lightBlue: "#eef6ff",
    statsGreen: "#3aa76d",
    statsGreenSoft: "rgba(58, 167, 109, 0.12)",
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
    // A real scale instead of one-off font-size literals per component —
    // new/refactored components should read from here.
    size: {
      xs: "12px",
      sm: "13.5px",
      md: "15px",
      lg: "17px",
      xl: "20px",
      xxl: "26px",
      display: "38px",
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 800,
    },
    lineHeight: {
      tight: 1.2,
      body: 1.5,
      relaxed: 1.65,
    },
  },

  radius: {
    sm: "10px",
    md: "16px",
    lg: "22px",
    pill: "999px",
  },

  space: (n) => `${n * 4}px`,

  shadow: {
    card: "0 1px 2px rgba(17,19,24,0.04), 0 8px 20px rgba(17,19,24,0.06)",
    raised: "0 4px 10px rgba(17,19,24,0.06), 0 16px 32px rgba(17,19,24,0.08)",
    popover: "0 8px 16px rgba(17,19,24,0.08), 0 24px 48px rgba(17,19,24,0.14)",
    accentGlow: "0 6px 16px rgba(29,78,216,0.22)",
  },

  // Semantic alias over `shadow` (kept intact — plenty of existing
  // components already reference shadow.* directly) plus a 4th level for
  // full-screen/modal-weight surfaces the card/raised/popover scale never
  // needed before.
  elevation: {
    0: "none",
    1: "0 1px 2px rgba(17,19,24,0.04), 0 8px 20px rgba(17,19,24,0.06)",
    2: "0 4px 10px rgba(17,19,24,0.06), 0 16px 32px rgba(17,19,24,0.08)",
    3: "0 8px 16px rgba(17,19,24,0.08), 0 24px 48px rgba(17,19,24,0.14)",
    4: "0 20px 60px rgba(17,19,24,0.18)",
  },

  motion: {
    fast: "120ms",
    base: "200ms",
    slow: "320ms",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  },

  breakpoint: {
    phone: "480px",
    tablet: "768px",
    desktop: "1080px",
  },

  // Admin-console-only palette — deliberately namespaced instead of
  // overwriting the tokens above. The consumer-facing app (Home, search,
  // bookings, auth) keeps its own already-tuned palette; only
  // DashboardShell's admin variant and admin/* pages read from here, so a
  // "make the admin panel feel like enterprise fleet-ops software" pass
  // can't regress the shopper-facing product.
  admin: {
    color: {
      // Mirrors the consumer accent's green — same rebrand, same
      // collision-avoidance reasoning (see theme.color.success above).
      primary: "#15803d",
      primaryDark: "#166534",
      primarySoft: "rgba(21, 128, 61, 0.1)",
      onPrimary: "#ffffff",

      navy: "#0f172a",
      navySurface: "#182338",
      navyBorder: "rgba(255, 255, 255, 0.08)",
      navyText: "#e2e8f0",
      navyTextMuted: "#94a3b8",

      bg: "#f8fafc",
      surface: "#ffffff",
      border: "#e2e8f0",

      text: "#0f172a",
      textSecondary: "#64748b",
      textMuted: "#94a3b8",

      success: "#0d9488",
      successSoft: "rgba(13, 148, 136, 0.1)",
      warning: "#d97706",
      warningSoft: "rgba(217, 119, 6, 0.1)",
      danger: "#dc2626",
      dangerSoft: "rgba(220, 38, 38, 0.1)",
      info: "#0284c7",
      infoSoft: "rgba(2, 132, 199, 0.1)",
    },
    radius: {
      control: "8px",
      card: "12px",
      panel: "16px",
    },
    shadow: {
      card: "0 1px 2px rgba(15, 23, 42, 0.04)",
      raised: "0 4px 12px rgba(15, 23, 42, 0.08)",
      popover: "0 12px 32px rgba(15, 23, 42, 0.16)",
    },
  },
};

export default theme;
