# Colour

Semantic tokens only. The literal palette lives in one file and is referenced nowhere else.

## 1. Semantic layer (what components use)

```
brand.primary  brand.primaryPressed  brand.primarySubtle  brand.onPrimary  brand.secondary  brand.accent
bg.canvas  bg.subtle  bg.inverse
surface.default  surface.raised  surface.sunken  surface.overlay  surface.scrim  surface.disabled
text.primary  text.secondary  text.tertiary  text.disabled  text.inverse  text.link  text.onBrand
border.subtle  border.default  border.strong  border.focus
status.{success|warning|error|info}.{base|surface|text|border}
money.positive  money.negative  money.neutral  money.pending
overlay.pressed  overlay.selected  skeleton.base  skeleton.highlight
```

If a component needs a colour that is not on this list, you need a new semantic token - not a hex value.

## 2. Building a palette from one brand colour

Given a single brand hex (from a logo, an existing app, or chosen by you):

1. **Generate a brand ramp** of 10 steps (50 -> 900) by varying lightness in a perceptual space (OKLCH/HSL with corrections), keeping hue and adjusting chroma so mid-tones are not muddy.
2. **Pick `brand.primary`** as the step that reaches >= 4.5:1 against white for text-on-white use, or is dark enough that white text on it reaches >= 4.5:1 (usually step 600 for a light theme).
3. `brand.primaryPressed` = one step darker (light theme) / one step lighter (dark theme).
4. `brand.primarySubtle` = step 50-100 (light) / a 12-16% alpha of the primary (dark).
5. `brand.onPrimary` = white or near-black, whichever reaches >= 4.5:1 against `brand.primary`.
6. **Build a neutral ramp**, slightly tinted toward the brand hue (2-6% chroma). Pure grey next to a warm brand looks dirty.
7. **Status colours** are hue-fixed (green/amber/red/blue) and tuned for contrast, not for matching the brand.

If there is no brand colour at all: choose a restrained, category-appropriate hue - a deep blue/indigo or a dark green for fintech, and say so in one line. Do not use pure `#000` for text or `#FFF` for surfaces in light mode.

## 3. Light theme mapping

| Token | Source |
| --- | --- |
| `bg.canvas` | neutral 50 (a hair off white, e.g. `#F7F8FA`) |
| `bg.subtle` | neutral 100 |
| `surface.default` | white |
| `surface.raised` | white + elevation 1 |
| `surface.sunken` | neutral 100 |
| `text.primary` | neutral 900 (not pure black) |
| `text.secondary` | neutral 600 |
| `text.tertiary` | neutral 500 |
| `text.disabled` | neutral 400 |
| `border.subtle` | neutral 200 |
| `border.default` | neutral 300 |
| `border.strong` | neutral 400 |
| `border.focus` | `brand.primary` |
| `surface.scrim` | black at 40-50% |

Dark theme mapping is in `dark-mode.md`. Both must exist for every token.

## 4. Contrast requirements

| Element | Minimum |
| --- | --- |
| Body text | 4.5:1 (target 7:1 for `text.primary`) |
| Text >= 18.66 pt bold or >= 24 pt | 3:1 |
| Icons that carry meaning | 3:1 |
| Borders that are the only affordance (input outline, unselected chip) | 3:1 |
| Focus indicator against both the control and the background | 3:1 |
| Disabled elements | Exempt, but keep readable |

Check both themes. A colour that passes on white commonly fails on `#121212`.

## 5. Colour is never alone

Never encode meaning in hue only:
- Success/error: colour **plus** an icon **plus** the word.
- Selected state: colour **plus** weight/border/checkmark.
- Money direction: colour **plus** an explicit sign (`+`/`-`) and a label ("Received"/"Sent").
- Charts: colour **plus** direct labels or distinct shapes/patterns.

Roughly 1 in 12 men has a colour vision deficiency, and the most common one makes red/green pairs unreliable - exactly the pair fintech reaches for first.

## 6. Money colours

```
money.positive  - credit / received / cashback earned      (green family, distinct from status.success)
money.negative  - debit / sent / spent                     (usually text.primary, NOT red)
money.neutral   - transfers between own accounts, zero
money.pending   - processing / on hold                     (amber family, or text.secondary + icon)
```

**Debits should not be red by default.** Red means "something went wrong". Spending money is normal. Use `text.primary` with a `-` prefix for debits, and reserve red for failed/reversed/declined transactions. Credits may be green because they are a positive surprise worth spotting.

Full rules in `fintech-ux.md`.

## 7. Status colours

| Status | Base | Surface | Meaning |
| --- | --- | --- | --- |
| success | green 600 | green 50 / green 900@16% | Completed, verified, approved |
| warning | amber 600 | amber 50 | Needs attention, pending action, expiring |
| error | red 600 | red 50 | Failed, invalid, declined, blocked |
| info | blue 600 | blue 50 | Neutral information, tips, "did you know" |

- `base` for icons, borders and bold text; `surface` as a banner/chip background; `text` is the accessible on-surface text (usually the 700-800 step).
- Never use status colours decoratively. A green card that isn't about success trains users to ignore green.

## 8. Where colour goes on a screen

- ~90% neutral: background, surfaces, text, borders.
- Brand colour on: the primary button, active tab/indicator, links, selected states, and small brand accents.
- One accent moment per screen at most (a balance card gradient, a highlighted offer).
- Illustrations and empty-state art use muted palette variants, not full-saturation brand.

## 9. Gradients

Allowed sparingly:
- Maximum one per screen, on one surface.
- Two stops, adjacent hues, low contrast between them.
- Never behind body text unless contrast is verified at both stops.
- Never on buttons that must show a pressed state (the state change disappears) - or if used, change opacity/scale on press.
- Prefer a solid brand surface. A well-chosen solid looks more premium than a gradient in almost every case.

## 10. Implementation

```ts
// tokens.ts - private
const neutral = { 50: '#F7F8FA', 100: '#EFF1F4', /* ... */ 900: '#101319' };
const brand   = { 50: '#EEF2FF', /* ... */ 600: '#3B49DF', 700: '#2E3ABF' };

// theme.ts - public
export const lightColor = {
  brand: { primary: brand[600], primaryPressed: brand[700], primarySubtle: brand[50], onPrimary: '#FFFFFF' },
  bg: { canvas: neutral[50], subtle: neutral[100] },
  surface: { default: '#FFFFFF', raised: '#FFFFFF', sunken: neutral[100] },
  text: { primary: neutral[900], secondary: neutral[600], tertiary: neutral[500] },
  // ...
} as const;
```

The hex values above are a **neutral fallback example**. Replace them with the project's brand. Never copy a palette from another product, and never scatter hex values across screens.

## 11. Checks before shipping

- [ ] No hex literal outside the theme file (grep for `#` in components).
- [ ] Both themes defined for every token.
- [ ] Body text contrast verified in both themes.
- [ ] No meaning conveyed by colour alone.
- [ ] Debits are not red.
- [ ] Brand colour appears on at most a few elements per screen.
- [ ] Status colours used only for status.
