// Design tokens for the mobile app.
//
// THE CONTRACT: no screen or component contains a literal size, colour,
// radius, duration or font size. If a value is needed and isn't here, it
// gets added here first, with a semantic name. A number written inline is a
// defect, not a shortcut — it's how an app ends up with 13px, 14px and 15px
// padding on three rows that were meant to look identical.
//
// Everything the old flat theme exported still exports, with the same names
// and (almost) the same values, because 40+ screens read `theme.color.x`,
// `theme.space(n)`, `theme.radius.md` and `theme.font.size.md` directly.
// This file only ADDS the vocabulary those screens were missing.

// ── Palette ────────────────────────────────────────────────────────────────
// Raw values live here and nowhere else. Screens never reference `palette`;
// they use the semantic names below, so a rebrand or a dark theme is a change
// to the mapping rather than a search-and-replace across the app.
const palette = {
  white: "#ffffff",
  black: "#000000",

  // Neutrals, warmed very slightly so large surfaces don't read as clinical.
  grey00: "#f6f7f9",
  grey05: "#eef0f3",
  grey10: "#e5e7eb",
  grey20: "#d1d5db",
  grey40: "#9ca3af",
  grey50: "#6b7280",
  grey60: "#4b5563",
  grey80: "#1f2430",
  grey90: "#151922",
  grey95: "#0f1219",

  green50: "#15803d",
  green60: "#166534",
  green40: "#22a355",

  teal50: "#0d9488",
  amber50: "#c98a04",
  red50: "#dc2f3c",
  blue50: "#2563eb",
};

// ── Semantic colour ────────────────────────────────────────────────────────
// `bg` is the page canvas, `surface` is what sits ON it. These used to be the
// same #ffffff, which is why every Card in the app was invisible — a white
// card on a white page separated only by a 1px grey hairline. Cards now read
// as cards without needing a border or a shadow to prove it, and that single
// change is most of what made the app feel unfinished.
const lightColor = {
  bg: palette.grey00,
  surface: palette.white,
  surfaceRaised: palette.grey05,
  surfaceSunken: palette.grey05,

  border: palette.grey10,
  borderStrong: palette.grey20,

  text: "#111318",
  textMuted: palette.grey60,
  textFaint: palette.grey50,
  textDisabled: palette.grey40,

  accent: palette.green50,
  accentStrong: palette.green60,
  accentSoft: "rgba(21, 128, 61, 0.10)",
  onAccent: palette.white,

  success: palette.teal50,
  successSoft: "rgba(13, 148, 136, 0.12)",
  warning: palette.amber50,
  warningSoft: "rgba(201, 138, 4, 0.12)",
  danger: palette.red50,
  dangerSoft: "rgba(220, 47, 60, 0.10)",
  info: palette.blue50,
  infoSoft: "rgba(37, 99, 235, 0.10)",

  // Money reads differently from status: an amount is not "an error" because
  // it's an outgoing payment. Kept separate so a debit is never painted with
  // the same red that means "something went wrong".
  moneyPositive: palette.green50,
  moneyNegative: "#b4232f",
  moneyPending: palette.amber50,

  // Navigation-bar specifics, to the brand spec. navInactive is a touch
  // cooler than textFaint (#6b7280) — at 12sp under an icon, that half-step
  // is the difference between "quietly available" and "disabled".
  navInactive: "#68707D",
  // green-100. The active pill behind a nav icon: present enough to locate,
  // light enough that it never competes with the icon sitting on it.
  accentSurface: "#DCFCE7",

  // Scrims and skeletons.
  scrim: "rgba(15, 18, 25, 0.45)",
  skeleton: palette.grey05,
  skeletonHighlight: palette.grey10,
};

// Prepared, not yet wired: the app has no theme provider, so every screen
// imports the static `theme` below. Switching is a follow-up (see the note in
// the app's README) — shipping a half-applied dark mode is worse than none,
// because the half that isn't converted becomes unreadable rather than merely
// light. Kept here so the mapping is written once, while the reasoning is
// fresh, rather than reinvented later.
export const darkColor = {
  bg: palette.grey95,
  surface: palette.grey90,
  surfaceRaised: palette.grey80,
  surfaceSunken: palette.black,

  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.18)",

  text: "#f3f4f6",
  textMuted: "#a8b0bd",
  textFaint: "#8b93a1",
  textDisabled: "#5b6270",

  accent: palette.green40,
  accentStrong: "#2ebd63",
  accentSoft: "rgba(34, 163, 85, 0.16)",
  onAccent: palette.grey95,

  success: "#2dd4bf",
  successSoft: "rgba(45, 212, 191, 0.16)",
  warning: "#e8b13a",
  warningSoft: "rgba(232, 177, 58, 0.16)",
  danger: "#f2606c",
  dangerSoft: "rgba(242, 96, 108, 0.16)",
  info: "#5b93f7",
  infoSoft: "rgba(91, 147, 247, 0.16)",

  moneyPositive: palette.green40,
  moneyNegative: "#f2606c",
  moneyPending: "#e8b13a",

  navInactive: "#8b93a1",
  accentSurface: "rgba(34, 163, 85, 0.20)",

  scrim: "rgba(0, 0, 0, 0.6)",
  skeleton: palette.grey80,
  skeletonHighlight: "#2a3140",
};

// ── Spacing ────────────────────────────────────────────────────────────────
// A 4pt scale with named steps. `space(n)` is kept because ~40 screens call
// it, but a NAMED step is the one to reach for: `space.md` says "the standard
// gap", while `theme.space(4)` says only "sixteen", which is how 13 and 14
// end up next to each other in the first place.
const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
};

// ── Type ───────────────────────────────────────────────────────────────────
// Every style is a size/line-height PAIR. Typography.js used to multiply size
// by 1.4 or 1.5 inline, which gave fractional line heights that don't land on
// the pixel grid and drift between components.
//
// Body is 16, not the old 15: 16 is the platform default that respects a
// user's font-size setting predictably, and the smallest text in the app is
// 12 (rule: never below 12).
const fontSize = {
  xs: 12,
  sm: 14, // was 13.5 — fractional sizes render inconsistently across densities
  md: 16, // body
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 32,
};

const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

// Named roles, so a screen asks for "a caption" rather than for "12px".
const text = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: fontWeight.bold },
  headline: { fontSize: 26, lineHeight: 32, fontWeight: fontWeight.bold },
  title: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.semibold },
  body: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.semibold },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.regular },
  label: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.semibold },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: fontWeight.regular },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.bold, letterSpacing: 0.6 },
};

// Money is never rendered with body type. Tabular figures keep every digit the
// same width, so a column of amounts aligns on the decimal instead of
// shimmering as the numbers change — the difference between a freight app that
// looks financial and one that looks like a blog.
const TABULAR = { fontVariant: ["tabular-nums"] };
const money = {
  xl: { fontSize: 36, lineHeight: 42, fontWeight: fontWeight.bold, ...TABULAR },
  lg: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold, ...TABULAR },
  md: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.semibold, ...TABULAR },
  sm: { fontSize: 16, lineHeight: 22, fontWeight: fontWeight.semibold, ...TABULAR },
  xs: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.medium, ...TABULAR },
};

// ── Shape ──────────────────────────────────────────────────────────────────
// sm/md/lg/pill keep their old values so nothing shifts; the named roles below
// are what new code should use, because "control" and "card" survive a change
// of taste in a way that "md" doesn't.
const radius = {
  xs: 4,
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,

  control: 12,
  card: 16,
  sheet: 24,
};

// ── Elevation ──────────────────────────────────────────────────────────────
// Android reads `elevation`; iOS reads the shadow* family. Both are set on
// every level so a surface looks the same on both platforms instead of being
// flat on one of them. Level 0 is deliberately a hairline border rather than
// a shadow — most surfaces should separate by contrast, not by floating.
const elevation = {
  0: {},
  1: {
    shadowColor: palette.black,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  2: {
    shadowColor: palette.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  3: {
    shadowColor: palette.black,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

// ── Motion ─────────────────────────────────────────────────────────────────
// Press feedback must land inside 100ms to feel attached to the finger, hence
// `fast`. Anything above `slow` starts to feel like the app is thinking.
const motion = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 320,
  deliberate: 480,
};

// ── Layout ─────────────────────────────────────────────────────────────────
// The 48dp touch floor is an accessibility requirement, not a preference: it
// is roughly the area of an adult fingertip, and controls below it are
// measurably harder to hit for everyone and unusable for some. Controls that
// LOOK smaller keep the floor via hitSlop rather than by shrinking.
const layout = {
  touchTarget: 48,
  touchGap: 8,
  gutter: 16,
  gutterWide: 20,
  maxContentWidth: 640,

  control: {
    lg: 52, // primary CTA
    md: 48, // default — also the touch floor
    sm: 40,
    xs: 32, // needs hitSlop to reach 48
  },
  input: 52,
  row: {
    single: 56,
    double: 64,
    rich: 72, // avatar/thumb + two lines + trailing value
  },
  icon: { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 },
  hairline: 1,
};

// `space` stays callable — theme.space(4) — and also carries the named steps
// as properties, so both `theme.space(4)` and `theme.space.md` resolve. That
// lets new code use the scale without a migration of every existing screen.
const space = Object.assign((n) => n * 4, spacing);

export const theme = {
  color: lightColor,
  space,
  spacing,
  radius,
  elevation,
  motion,
  layout,
  text,
  money,
  font: { size: fontSize, weight: fontWeight },
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

// Badge used to build its tint by concatenating "20" onto whatever
// statusColor resolved to — which silently produces an invalid colour the
// moment that value is an rgba() string rather than a 6-digit hex, and
// couldn't be reused anywhere else. This handles both forms explicitly.
export const withAlpha = (color, alpha) => {
  if (typeof color !== "string") return color;
  if (color.startsWith("rgba(")) return color.replace(/[\d.]+\)$/, `${alpha})`);
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const hex = Math.round(alpha * 255).toString(16).padStart(2, "0");
    return `${color}${hex}`;
  }
  return color;
};

export default theme;
