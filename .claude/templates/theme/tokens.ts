/**
 * Design tokens — every non-colour value, plus the private colour palette.
 *
 * Matches the token contract in
 * skills/mobile-product-engineer/references/design-system.md.
 *
 * Rule: components never contain a literal value. If a component needs
 * something that is not here, add it here first, with a semantic name.
 */

/* ------------------------------------------------------------ spacing */
/** 4 pt base scale. Every gap, padding and margin comes from this. */
export const spacing = {
  0: 0,
  1: 2,   // hairline nudges, optical correction
  2: 4,   // icon-to-label, chip inner padding
  3: 8,   // tightly related items, badge padding
  4: 12,  // compact component internals, row vertical padding
  5: 16,  // default gutter, card padding, between form fields
  6: 20,  // gutter >= 400 dp, comfortable card padding
  7: 24,  // between sub-sections, gutter on tablets
  8: 32,  // between major sections
  9: 40,  // above a primary CTA block, below a hero
  10: 48, // empty-state breathing room
  12: 64, // rare, large hero separation
} as const;

/* ------------------------------------------------------------- layout */
export const layout = {
  gutter: { compact: 16, regular: 20, expanded: 24 }, // < 400 / >= 400 / >= 600 dp
  maxContentWidth: 640, // centre content beyond this
  sectionGap: 32,
  itemGap: 12,
  headerHeight: 56, // content height, excluding the top inset
  tabBarHeight: 56, // content height, excluding the bottom inset
  listBottomPadding: 16, // plus insets.bottom (+ tabBarHeight when tabs are present)
} as const;

export const breakpoint = { compact: 400, large: 600, expanded: 840 } as const;

/* ------------------------------------------------------------- radius */
export const radius = {
  none: 0,
  xs: 4,   // inner elements nested in a 12–16 radius parent
  sm: 8,
  md: 12,  // controls: buttons, inputs, chips
  lg: 16,  // cards, sheets
  xl: 20,
  xxl: 28, // sheet top corners
  pill: 999,
} as const;

/* --------------------------------------------------------- typography */
/** Always pair size with an explicit lineHeight — platform defaults differ. */
export const type = {
  display:    { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  headline:   { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  title:      { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  subtitle:   { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.1 },
  body:       { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 0 },
  bodySmall:  { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
  label:      { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2 },
  caption:    { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.2 },
  overline:   { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },

  /* Money. Tabular figures are mandatory so digits never jitter. */
  amountXL: { fontSize: 36, lineHeight: 42, fontWeight: '700', fontVariant: ['tabular-nums'] },
  amountL:  { fontSize: 28, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  amountM:  { fontSize: 20, lineHeight: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  amountS:  { fontSize: 16, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  amountXS: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
} as const;

/* ---------------------------------------------------------- elevation */
/** Level 0 uses border.subtle for separation. Dark mode uses lighter surfaces instead. */
export const elevation = {
  0: {},
  1: {
    ios: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, shadowOpacity: 0.06 },
    android: { elevation: 1 },
  },
  2: {
    ios: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.08 },
    android: { elevation: 3 },
  },
  3: {
    ios: { shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, shadowOpacity: 0.12 },
    android: { elevation: 8 },
  },
} as const;

/* ------------------------------------------------------------- motion */
export const duration = {
  instant: 80,
  fast: 140,      // press feedback, switches, checkboxes
  base: 220,      // fades, tooltips, inline expand, toasts, sheets
  slow: 320,      // screen transitions, dialogs
  deliberate: 480, // success celebration, once
  pulse: 900,      // skeleton shimmer half-cycle
} as const;

export const easing = {
  standard:   [0.2, 0.0, 0.0, 1.0],
  decelerate: [0.0, 0.0, 0.0, 1.0], // entering
  accelerate: [0.3, 0.0, 1.0, 1.0], // exiting
  emphasis:   [0.2, 0.0, 0.0, 1.0], // large surface moves
} as const;

export const spring = {
  gentle: { damping: 20, stiffness: 180 },
  snappy: { damping: 18, stiffness: 260 },
} as const;

/* --------------------------------------------------------------- size */
export const size = {
  touchTarget: 48, // minimum hit area, both platforms
  touchGap: 8,     // minimum space between adjacent targets
  icon: { xs: 16, sm: 20, md: 24, lg: 32 },
  avatar: { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 },
  button: { lg: 52, md: 48, sm: 40, xs: 32 },
  input: { default: 52, multiline: 96 },
  row: { compact: 48, standard: 56, twoLine: 64, transaction: 72 },
  border: { hairline: 1, focus: 2 },
  fab: 56,
} as const;

/* ------------------------------------------------------------ palette */
/**
 * PRIVATE. Raw literals live here and are referenced only by theme.ts.
 * Replace these with the project's brand ramp — see references/colors.md
 * for deriving a full palette from a single brand hex. Keep the token
 * names in theme.ts unchanged.
 */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  // Neutral ramp, very slightly tinted toward the brand hue.
  n50: '#F7F8FA', n100: '#EFF1F5', n200: '#E7E9EE', n300: '#D6DAE1',
  n400: '#AEB4BE', n500: '#818894', n600: '#5A616E', n700: '#3C424D',
  n800: '#22262E', n900: '#111318',

  // Dark-theme surface ladder: elevation as lightness, not shadow.
  d0: '#0B0D10', d1: '#0F1216', d2: '#16191F', d3: '#1D212A', d4: '#242933',
  dText: '#E6E9EF', dText2: '#A0A7B4', dText3: '#79808D', dText4: '#535A66',

  // Brand.
  brand600: '#1F5EFF', brand700: '#1747C4', brand100: '#EAF0FF', brand300: '#6E97FF',

  // Status, hue-fixed and tuned for contrast rather than for brand match.
  green600: '#0E9F6E', green100: '#E7F7F0', green800: '#08694A', green300: '#3BD4A0',
  amber600: '#C77700', amber100: '#FDF3E2', amber800: '#8A5300', amber300: '#F0B357',
  red600:   '#D92D20', red100:   '#FDECEA', red800:   '#912018', red300:   '#FF7B72',
} as const;

export const tokens = {
  spacing, layout, breakpoint, radius, type, elevation, duration, easing, spring, size,
} as const;
