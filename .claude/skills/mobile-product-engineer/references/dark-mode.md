# Dark mode

Dark mode is a second full theme, not an inverted light theme. Every semantic token needs a dark value decided deliberately.

## 1. Rules

1. Follow the system by default (`useColorScheme`). Offer Light / Dark / System in settings if the product warrants it — System is the default.
2. **Never pure black** (`#000`) as the canvas on a standard app, and **never pure white** text. Both cause halation and eye strain. Canvas ~`#0B0D10`–`#121417`; primary text ~`#E6E9EF`.
3. Elevation is expressed with **lighter surfaces**, not shadows. Shadows are nearly invisible on dark.
4. Saturated colours must be **desaturated and lightened** for dark. A brand colour tuned for white will vibrate on dark.
5. Contrast must be re-verified in dark. It does not inherit.
6. Both themes ship together. A screen is not done until it has been viewed in dark mode.

## 2. Surface elevation ladder

In light mode, higher = more shadow. In dark mode, higher = lighter.

```
bg.canvas         #0B0D10   base
surface.sunken    #0F1216   wells, inset areas
surface.default   #16191F   cards, sheets, rows
surface.raised    #1D212A   raised cards, menus
surface.overlay   #242933   dialogs, top-most sheets
```

Each step is a small, even lightness increase. Keep a subtle border (`border.subtle`, ~8–12% white) on cards — on dark, a border separates surfaces more reliably than a shadow.

Do not stack more than 3 elevation levels. If you need a 4th, the hierarchy is wrong. -> `cards-and-surfaces.md`

## 3. Text ramp

| Token | Dark value | Contrast on `surface.default` |
| --- | --- | --- |
| `text.primary` | ~`#E6E9EF` | ≥ 12:1 |
| `text.secondary` | ~`#A0A7B4` | ≥ 6:1 |
| `text.tertiary` | ~`#79808D` | ≥ 4.5:1 |
| `text.disabled` | ~`#535A66` | exempt, still legible |

Do not simply flip the light ramp. In dark mode the perceptual gaps between greys compress — secondary text needs to be lighter than a naive inversion suggests.

## 4. Brand and status colours

For each brand/status colour, define a dark variant:

- **Lighten** by 1–2 ramp steps so it reads against a dark surface.
- **Reduce chroma** slightly — full saturation on dark glows.
- Re-check `brand.onPrimary`: white text on a lightened brand may now fail 4.5:1, and near-black text may be correct instead.
- `brand.primarySubtle` in dark = a 12–16% alpha of the brand colour, not a pale tint.

Status colours in dark:

| | Light base | Dark base |
| --- | --- | --- |
| success | deep green | lighter, slightly desaturated green |
| warning | amber | lighter amber (dark text on it, not white) |
| error | red | lighter red — deep red on dark is unreadable |
| info | blue | lighter blue |

Status *surfaces* (the tinted background behind a badge) become low-alpha tints of the status colour, not pale pastels.

## 5. Money colours

Green/red for credit/debit must remain distinguishable and must not glow. Verify both against `surface.default` at ≥ 4.5:1. And, as always, colour is never the only signal — the `+`/`−` sign and the label carry the meaning. -> `fintech-ux.md`, `accessibility.md`

## 6. Images, logos and illustrations

- Logos need a dark-mode variant, or a version that works on both. A dark logo on a dark canvas is a visible bug.
- Photos: reduce brightness slightly or add a subtle scrim so they do not blaze out of a dark screen.
- Illustrations need dark variants — recolour rather than inverting.
- Icons come from the theme's text colour tokens, never hardcoded black.
- Charts need dark-specific gridlines, axis labels and series colours. -> `lists-and-data.md`
- Transparent PNGs designed for a white background will show fringing. Prefer SVG.

## 7. Implementation

```ts
// theme/theme.ts
export const lightTheme = { ...scales, isDark: false, color: { ... } } as const;
export type Theme = typeof lightTheme;
export const darkTheme: Theme = { ...scales, isDark: true, color: { ... } };
//           ^^^^^^^ same type — a missing dark token is a compile error

// theme/ThemeProvider.tsx
const scheme = useColorScheme();        // 'light' | 'dark' | null
const theme  = scheme === 'dark' ? darkTheme : lightTheme;
```

- Both objects satisfy the **same** TypeScript type. A missing dark token is then a compile error, which is exactly what you want.
- Provide via context; consume with a `useTheme()` hook. Never read `useColorScheme()` inside components to pick raw colours.
- If the app offers an in-app override, persist it and apply it before first paint.
- Status bar style must flip with the theme.
- Navigation container theme, `StatusBar`, sheet backdrops, `RefreshControl` tint, keyboard appearance (`keyboardAppearance="dark"`) and native modal backgrounds all need the theme applied — these are the usual leaks.

## 8. Cold start

Set the native background colour so launch does not flash white:

- **iOS**: launch screen background + `UIUserInterfaceStyle` left unset (or `Automatic`). Setting it to `Light` disables dark mode entirely.
- **Android**: `windowBackground` in the dark theme (`values-night/`). -> `android.md`
- **Expo**: `userInterfaceStyle: "automatic"`, plus `backgroundColor` and dark splash config.

A white flash on every cold start is one of the most visible quality defects there is.

## 9. Common defects

| Symptom | Cause |
| --- | --- |
| White flash on launch | Native background/splash not themed |
| Invisible card edges | Relying on shadows for separation |
| Glowing text or buttons | Fully saturated colours not tuned for dark |
| Unreadable secondary text | Light ramp inverted rather than redesigned |
| Black logo on black | No dark asset variant |
| A screen still light | Hardcoded hex outside the theme |
| Status bar text invisible | `barStyle` not flipped |
| Sheet backdrop wrong | Native component not receiving theme |
| Charts unreadable | No dark chart palette |

## 10. Checklist

- [ ] Every semantic token has a dark value (type-enforced)
- [ ] No pure black canvas, no pure white text
- [ ] Elevation via surface lightness + subtle borders
- [ ] Contrast re-verified in dark for text, icons, borders, placeholders
- [ ] Brand and status colours retuned, `onPrimary` re-checked
- [ ] Logos, illustrations, charts have dark variants
- [ ] No white flash on cold start
- [ ] Status bar, keyboard, sheets, modals, refresh control themed
- [ ] Every screen viewed in dark mode, including error/empty/loading states
