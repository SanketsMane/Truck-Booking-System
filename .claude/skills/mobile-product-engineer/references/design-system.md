# Design System (Token Contract)

The single source of truth for every numeric and colour value in this skill. Every other reference file defers to this one. A ready-to-copy implementation lives in `../../../templates/theme/`.

## 1. Rules of the system

1. **No literal values in components.** No `padding: 14`, no `#1A1A1A`, no `fontSize: 15`. Only `theme.spacing[4]`, `theme.color.text.primary`, `theme.type.body`.
2. **Semantic over literal.** Components consume `color.text.secondary`, never `palette.gray600`. The literal palette is private to the theme file.
3. **One system per app.** If the project already has tokens, use them and extend them. Never ship a second parallel system.
4. **Extend in the theme.** New need -> new token in the theme file with a semantic name -> used everywhere. Never a one-off constant in a component.
5. **Every token has a dark-mode value.** Adding a light token without its dark counterpart is an incomplete change.

## 2. Spacing scale (4 pt base)

```ts
spacing = { 0: 0, 1: 2, 2: 4, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 32, 9: 40, 10: 48, 12: 64 }
```

| Token | Value | Typical use |
| --- | --- | --- |
| `1` | 2 | Hairline nudges, optical correction |
| `2` | 4 | Icon-to-label, chip inner padding |
| `3` | 8 | Between tightly related items, badge padding |
| `4` | 12 | Inside compact components, list row vertical padding |
| `5` | 16 | Default gutter, card padding, between form fields |
| `6` | 20 | Gutter on >=400 dp, comfortable card padding |
| `7` | 24 | Between sub-sections, gutter on tablets |
| `8` | 32 | Between major sections |
| `9` | 40 | Above a primary CTA block, below a hero |
| `10` | 48 | Empty-state breathing room |
| `12` | 64 | Rare - large hero separation |

Layout constants:

```ts
layout = {
  gutter: { compact: 16, regular: 20, expanded: 24 },   // by screen width: <400 / >=400 / >=600
  maxContentWidth: 640,                                  // centre content beyond this
  sectionGap: 32,
  itemGap: 12,
  headerHeight: 56,        // content height, excluding top inset
  tabBarHeight: 56,        // content height, excluding bottom inset
  listBottomPadding: 16,   // plus insets.bottom (+ tabBarHeight when tabs are present)
}
```

## 3. Radius

```ts
radius = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 }
```

| Token | Value | Use |
| --- | --- | --- |
| `xs` 4 | Inner elements nested in a 12-16 radius parent |
| `sm` 8 | Small badges, thumbnails, tiny tiles |
| `md` 12 | Buttons, inputs, chips (non-pill), icon containers, small cards |
| `lg` 16 | Cards, grouped containers, bottom sheets' inner surfaces |
| `xl` 20 | Bottom sheet top corners (Android-leaning), large modals |
| `xxl` 28 | Bottom sheet top corners (iOS-leaning), full-screen sheet corners |
| `pill` | Chips, avatars, segmented controls, pill buttons, tags |

Nested radius: `inner = outer - padding` (clamped to >= 4). Full-bleed edges are square.

## 4. Typography

Sizes in pt/dp; second number is line height.

| Token | Size/LH | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display` | 34/40 | 700 | -0.6 | Rare hero numbers, onboarding titles |
| `headline` | 28/34 | 700 | -0.4 | Screen titles on large-title screens |
| `title` | 22/28 | 700 | -0.2 | Section heroes, dialog titles |
| `subtitle` | 17/24 | 600 | -0.1 | Header titles, card titles, list row primary (emphasis) |
| `body` | 16/24 | 400 | 0 | Default reading text, list row primary |
| `bodyStrong` | 16/24 | 600 | 0 | Emphasised body, row titles |
| `bodySmall` | 14/20 | 400 | 0 | Supporting text, row secondary |
| `label` | 13/18 | 600 | 0.2 | Buttons (small), field labels, tabs, badges |
| `caption` | 12/16 | 400 | 0.2 | Timestamps, helper text, metadata |
| `overline` | 11/14 | 700 | 0.8 | Section headers, uppercase only |

Numeric (always `fontVariant: ['tabular-nums']`):

| Token | Size/LH | Weight | Use |
| --- | --- | --- | --- |
| `amountXL` | 36/42 | 700 | Wallet balance hero |
| `amountL` | 28/34 | 700 | Payment confirmation amount, detail hero |
| `amountM` | 20/26 | 600 | Card balances, summary totals |
| `amountS` | 16/22 | 600 | Transaction row amounts |
| `amountXS` | 14/20 | 600 | Inline amounts, fees, small print |

Button label sizes: large 16/600, medium 15/600, small 13/600.
Minimum size anywhere: 12. Never render text below 11 even for legal copy.

## 5. Colour: semantic token set

Components may only use these names. Full palette construction and contrast rules: `colors.md`.

```
brand.primary            brand.primaryPressed     brand.primarySubtle      brand.onPrimary
brand.secondary          brand.accent

bg.canvas                bg.subtle                bg.inverse
surface.default          surface.raised           surface.sunken
surface.overlay          surface.scrim            surface.disabled

text.primary             text.secondary           text.tertiary
text.disabled            text.inverse             text.link            text.onBrand

border.subtle            border.default           border.strong        border.focus

status.success.base      status.success.surface   status.success.text   status.success.border
status.warning.*         status.error.*           status.info.*         (same four keys)

money.positive           money.negative           money.neutral         money.pending

overlay.pressed          overlay.selected         skeleton.base         skeleton.highlight
```

Meaning:
- `bg.canvas` - the screen background. `surface.default` - a surface sitting on it. `surface.raised` - a surface above that (cards, sheets). `surface.sunken` - inset wells (input backgrounds on a card).
- `text.tertiary` is for de-emphasised metadata only, never for anything the user must read to act.
- `money.positive/negative` are distinct from `status.success/error`: a debit is not an error.
- `status.*.surface` is a low-saturation tint for banners; `status.*.base` is the full-strength icon/border colour; `status.*.text` is the accessible text colour on `surface`.

## 6. Elevation

```ts
elevation = {
  0: { },                                                              // + border.subtle if separation needed
  1: { ios: { y: 1, blur: 3, opacity: 0.06 }, android: { elevation: 1 } },
  2: { ios: { y: 2, blur: 8, opacity: 0.08 }, android: { elevation: 3 } },
  3: { ios: { y: 8, blur: 24, opacity: 0.12 }, android: { elevation: 8 } },
}
```

Dark mode: shadows are near-invisible. Express elevation with progressively lighter surfaces (`surface.default` -> `surface.raised`) and, if needed, a 1 px `border.subtle`.

## 7. Motion

```ts
duration = { instant: 80, fast: 140, base: 220, slow: 320, deliberate: 480, pulse: 900 }
easing = {
  standard:   [0.2, 0.0, 0.0, 1.0],   // most transitions
  decelerate: [0.0, 0.0, 0.0, 1.0],   // entering
  accelerate: [0.3, 0.0, 1.0, 1.0],   // exiting
  emphasis:   [0.2, 0.0, 0.0, 1.0],   // large surface moves
}
spring = { gentle: { damping: 20, stiffness: 180 }, snappy: { damping: 18, stiffness: 260 } }
```

| What | Duration |
| --- | --- |
| Press feedback, switches, checkboxes | `fast` |
| Fades, tooltips, inline expand, toast in/out | `base` |
| Bottom sheets, dialogs | `base`-`slow` |
| Screen transitions | `slow` |
| Success celebration | `deliberate`, once |
| Skeleton shimmer half-cycle | `pulse` |

Gesture-driven motion uses springs and follows the finger; timed motion uses durations. See `animations.md`.

## 8. Sizing constants

```ts
size = {
  touchTarget: 48,          // minimum hit area, both platforms
  touchGap: 8,              // minimum space between adjacent targets
  icon: { xs: 16, sm: 20, md: 24, lg: 32 },
  avatar: { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 },
  button: { lg: 52, md: 48, sm: 40, xs: 32 },
  input: { default: 52, multiline: 96 },
  row: { compact: 48, standard: 56, twoLine: 64, transaction: 72 },
  border: { hairline: 1, focus: 2 },
  fab: 56,
}
```

## 9. Reference implementation shape

```ts
// theme/tokens.ts  - private literals
const palette = { /* raw hex, referenced nowhere else */ };

// theme/theme.ts   - public semantic themes
export const lightTheme = { color: {...}, spacing, radius, type, elevation, duration, size } as const;
export const darkTheme  = { ...lightTheme, color: {...} } as const;
export type Theme = typeof lightTheme;

// theme/ThemeProvider.tsx
export const useTheme = (): Theme => useContext(ThemeContext);
```

Consumption pattern (styles derived from the theme, memoised, never inline literals):

```tsx
const styles = useThemedStyles(({ color, spacing, radius, type }) => ({
  card: {
    backgroundColor: color.surface.raised,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[3],
  },
  title: { ...type.subtitle, color: color.text.primary },
}));
```

Copy `../../../templates/theme/` into `src/theme/` when a project has no system.

## 10. Adopting an existing project's system

1. Find it: `theme/`, `styles/`, `constants/`, `tamagui.config`, `nativewind`/`tailwind.config`, `restyle` theme, `styled-components` theme, or `unistyles`.
2. Map this contract onto theirs; use their names.
3. If their scale is 8-based, or their body is 15, **adopt theirs**. Consistency wins.
4. Only add tokens for genuine gaps, following their naming convention.
5. If tokens are absent but values are consistent in practice, extract the de-facto system into a theme file first, then build on it. Mention it in one line; do not turn it into a refactor project.
