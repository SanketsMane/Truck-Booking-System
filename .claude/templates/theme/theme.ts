/**
 * Public semantic themes. Components read these names and never touch `palette`.
 *
 * `ThemeColors` is the contract: both themes must satisfy it, so a token that
 * exists in light but not dark (or vice versa) is a compile error. That is the
 * whole guarantee — see references/design-system.md §5 and dark-mode.md.
 *
 * Palette construction and contrast rules: references/colors.md.
 */
import {
  palette as p,
  spacing, layout, breakpoint, radius, type, elevation, duration, easing, spring, size,
} from './tokens';

/* ------------------------------------------------ the semantic token set */

export type StatusColors = {
  /** Full-strength icon and border colour. */
  base: string;
  /** Low-saturation tint for banners and badges. */
  surface: string;
  /** Accessible text colour on `surface`. */
  text: string;
  border: string;
};

export type ThemeColors = {
  brand: {
    primary: string;
    primaryPressed: string;
    primarySubtle: string;
    onPrimary: string;
    secondary: string;
    accent: string;
  };
  bg: { canvas: string; subtle: string; inverse: string };
  surface: {
    default: string;
    raised: string;
    sunken: string;
    overlay: string;
    scrim: string;
    disabled: string;
  };
  text: {
    primary: string;
    secondary: string;
    /** De-emphasised metadata only — never anything the user must read to act. */
    tertiary: string;
    disabled: string;
    inverse: string;
    link: string;
    onBrand: string;
  };
  border: { subtle: string; default: string; strong: string; focus: string };
  status: Record<'success' | 'warning' | 'error' | 'info', StatusColors>;
  /** Distinct from status.*: a debit is not an error. */
  money: { positive: string; negative: string; neutral: string; pending: string };
  overlay: { pressed: string; selected: string };
  skeleton: { base: string; highlight: string };
};

/* ------------------------------------------------------------- mappings */

const lightColor: ThemeColors = {
  brand: {
    primary: p.brand600,
    primaryPressed: p.brand700,
    primarySubtle: p.brand100,
    onPrimary: p.white,
    secondary: p.green600,
    accent: p.brand300,
  },
  bg: { canvas: p.n50, subtle: p.n100, inverse: p.n900 },
  surface: {
    default: p.white,
    raised: p.white,
    sunken: p.n100,
    overlay: p.white,
    scrim: 'rgba(0,0,0,0.45)',
    disabled: p.n100,
  },
  text: {
    primary: p.n900, // not pure black
    secondary: p.n600,
    tertiary: p.n500,
    disabled: p.n400,
    inverse: p.white,
    link: p.brand600,
    onBrand: p.white,
  },
  border: { subtle: p.n200, default: p.n300, strong: p.n400, focus: p.brand600 },
  status: {
    success: { base: p.green600, surface: p.green100, text: p.green800, border: '#A8E2CC' },
    warning: { base: p.amber600, surface: p.amber100, text: p.amber800, border: '#F0D2A0' },
    error:   { base: p.red600,   surface: p.red100,   text: p.red800,   border: '#F4B7B1' },
    info:    { base: p.brand600, surface: p.brand100, text: '#123FAE',  border: '#B6C9FF' },
  },
  // Credits are green; debits are neutral, because spending is not a failure.
  // Red is reserved for status.error. Sign and label carry the meaning, not colour.
  money: { positive: p.green600, negative: p.n900, neutral: p.n900, pending: p.amber600 },
  overlay: { pressed: 'rgba(17,19,24,0.06)', selected: 'rgba(31,94,255,0.08)' },
  skeleton: { base: p.n200, highlight: p.n100 },
};

const darkColor: ThemeColors = {
  brand: {
    // Lightened and slightly desaturated — a colour tuned for white glows on dark.
    primary: p.brand300,
    primaryPressed: '#8FAEFF',
    primarySubtle: 'rgba(110,151,255,0.16)',
    onPrimary: p.d0, // near-black passes 4.5:1 on the lightened brand; white would not
    secondary: p.green300,
    accent: p.brand300,
  },
  bg: { canvas: p.d0, subtle: p.d1, inverse: p.n50 },
  // Elevation as lightness, not shadow — shadows are invisible on dark.
  surface: {
    default: p.d2,
    raised: p.d3,
    sunken: p.d1,
    overlay: p.d4,
    scrim: 'rgba(0,0,0,0.6)',
    disabled: p.d3,
  },
  text: {
    primary: p.dText, // not pure white
    secondary: p.dText2,
    tertiary: p.dText3,
    disabled: p.dText4,
    inverse: p.n900,
    link: p.brand300,
    onBrand: p.d0,
  },
  border: {
    subtle: 'rgba(255,255,255,0.08)',
    default: 'rgba(255,255,255,0.14)',
    strong: 'rgba(255,255,255,0.24)',
    focus: p.brand300,
  },
  status: {
    success: { base: p.green300, surface: 'rgba(59,212,160,0.14)',  text: '#7BE7C2', border: 'rgba(59,212,160,0.32)' },
    warning: { base: p.amber300, surface: 'rgba(240,179,87,0.14)',  text: '#F7CE92', border: 'rgba(240,179,87,0.32)' },
    error:   { base: p.red300,   surface: 'rgba(255,123,114,0.14)', text: '#FFAAA4', border: 'rgba(255,123,114,0.32)' },
    info:    { base: p.brand300, surface: 'rgba(110,151,255,0.14)', text: '#A3BCFF', border: 'rgba(110,151,255,0.32)' },
  },
  money: { positive: p.green300, negative: p.dText, neutral: p.dText, pending: p.amber300 },
  overlay: { pressed: 'rgba(255,255,255,0.08)', selected: 'rgba(110,151,255,0.14)' },
  skeleton: { base: p.d3, highlight: p.d4 },
};

/* --------------------------------------------------------------- themes */

const scales = {
  spacing, layout, breakpoint, radius, type, elevation, duration, easing, spring, size,
} as const;

export const lightTheme = { ...scales, isDark: false, color: lightColor };

export type Theme = typeof lightTheme;

export const darkTheme: Theme = { ...scales, isDark: true, color: darkColor };
