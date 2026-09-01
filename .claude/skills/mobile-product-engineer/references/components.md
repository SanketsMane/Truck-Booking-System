# Component Rules

Every interactive component must define its states before it is built. Sizes and colours come from `design-system.md`.

## 0. The state matrix

For each interactive component, decide which of these apply and how each looks:

`default · pressed · focused · selected · disabled · loading · error · success · empty`

Rules that apply to all of them:
- Pressed feedback within 100 ms, always.
- Disabled never disappears; it dims and explains why (helper text, tooltip on tap, or a toast).
- Loading preserves layout size - never let a button shrink to a spinner.
- Any state change that matters is announced to screen readers (`accessibilityState`).
- Minimum hit area 48x48 regardless of visual size.

## 1. Buttons

**Variants** (one primary per screen):

| Variant | Appearance | Use |
| --- | --- | --- |
| Primary | Filled `brand.primary`, `brand.onPrimary` label | The one main action |
| Secondary | `surface.sunken` or 1 px `border.default`, `text.primary` label | Alternative actions |
| Tertiary / Text | Label only, `brand.primary` | Low-emphasis, inline |
| Destructive | Filled or outlined `status.error` | Delete, remove, cancel-with-consequence |
| Icon | 48x48 hit area, 24 icon | Header actions, compact controls |
| FAB (Android-leaning) | 56 circle, elevation 3 | One creating action on a list screen |

**Sizes:** lg 52 / md 48 / sm 40 / xs 32. Radius `md` (12) or `pill`. Full-width for sticky footer CTAs and forms; hug-content for inline actions.

**States:**
```
default    tokens
pressed    filled: brand.primaryPressed; others: overlay.pressed or opacity 0.7 (iOS) / ripple (Android)
disabled   surface.disabled bg + text.disabled label, opacity 1 (not a faded button - a disabled one)
loading    spinner in brand.onPrimary replacing the label, same width, disabled, accessibilityState.busy
```

**Rules:**
- Label is a verb: "Send money", "Verify", "Add bank account". Never "Submit", "OK", "Click here".
- One filled brand button per screen.
- Never disable the primary CTA without telling the user why. Prefer enabled + inline validation on press.
- Destructive buttons are never the visually dominant element on a screen and never the default in a dialog.
- Icons in buttons sit before the label (8 gap) unless they indicate direction/continuation (then after).
- Debounce submits; the second tap must not double-charge. Disable on press for network actions.

## 2. Inputs

Anatomy: `label (13/600, text.secondary)` -> `field (52 tall, radius 12, 16 horizontal padding)` -> `helper or error (12/400)`.

| State | Treatment |
| --- | --- |
| default | 1 px `border.default`, `surface.default` bg |
| focused | 2 px `border.focus`, keep total height stable (compensate padding) |
| filled | Same as default; label stays visible above the field |
| error | 1-2 px `status.error.base` border, error text below, error icon optional |
| disabled | `surface.disabled`, `text.disabled`, no border emphasis |
| read-only | Looks like a field but no border emphasis; distinguish from disabled |

Rules: always a persistent label (placeholder-only fields fail the moment the user types), correct `keyboardType`/`textContentType`/`autoComplete`, no auto-capitalisation on emails, and never block paste on OTP or code fields. Full detail: `forms-and-inputs.md`.

## 3. Cards

Use only for separable objects. See `cards-and-surfaces.md`.
- `surface.raised`, radius `lg` (16), padding 16-20, elevation 0-1.
- Whole card is pressable if it navigates; then it needs a pressed state (scale 0.98 or overlay) and `accessibilityRole="button"`.
- At most one action inside a card. Two actions means it is a section, not a card.
- Never nest a card inside a card.

## 4. List rows

Heights: 48 compact / 56 standard / 64 two-line / 72 transaction (with avatar + amount).

```
[leading: avatar 40 / icon 24 in a 40 container] 12 [title (body/bodyStrong, 1 line)]
                                                    [subtitle (bodySmall, text.secondary)]
                                              flex  [trailing: amount (amountS) or chevron 20 or switch]
```

Rules:
- The entire row is the touch target.
- One trailing element type per list. Do not mix chevrons, switches and amounts in one list.
- Separators: 1 px `border.subtle`, inset to the title start (usually 68 from the left when there is a 40 avatar + 16 gutter + 12 gap), or omitted entirely if rows are >= 72 tall and visually distinct.
- Rows never truncate the trailing value; the title truncates.
- Swipe actions must have a non-gesture equivalent.

## 5. Avatars

- Sizes 24 / 32 / 40 / 56 / 80. Circle. `pill` radius.
- Fallback order: image -> initials (1-2 chars, `label` type, deterministic tint from a fixed hue set) -> neutral person icon. Never a broken image.
- Group avatars: overlap by 30% with a 2 px `surface.default` ring.
- Presence/verification badges anchor bottom-right with a ring in the surface colour.

## 6. Badges & chips

**Badge** (status/count, non-interactive): height 20-24, radius `pill` or `xs`, padding 8/2, `label` or `caption` type, `status.*.surface` bg with `status.*.text`. Counts cap at "99+". Dot badges (8 px) when the number is not useful.

**Chip** (interactive filter/selection): height 32-36, radius `pill`, padding 12 horizontal.
```
unselected  surface.default + 1px border.default + text.primary
selected    brand.primarySubtle bg + brand.primary text + 1px brand.primary border (+ check icon)
disabled    surface.disabled + text.disabled
```
Horizontal chip rows scroll with the first chip at the gutter and no clipping; add 8 gap and `contentContainerStyle` gutter padding.

## 7. Tabs & segmented controls

| Control | Use | Rules |
| --- | --- | --- |
| Top tabs | 2-5 peer views inside a screen | Underline indicator 2-3 px animated, active label 600, inactive `text.secondary`. Swipeable between tabs. Scrollable only when > 4. |
| Segmented control | 2-4 mutually exclusive filters | Fixed width segments, `surface.sunken` track, `surface.default` thumb, animated thumb slide 140 ms |
| Bottom tabs | 2-5 top-level destinations | See `navigation.md` |

Never both top tabs and a segmented control on the same screen. Never tabs with only one tab.

## 8. Switches, checkboxes, radios

| Control | Semantics | Behaviour |
| --- | --- | --- |
| Switch | Immediate, reversible setting | Applies instantly; no Save button. Optimistic with rollback + toast on failure. Platform-native look. |
| Checkbox | Multi-select, or terms acceptance | Requires an explicit submit. 20-24 visual, 48 hit area. Label is tappable. |
| Radio | One of a short visible list (2-5) | Otherwise use a picker/sheet. Whole row tappable. |

All three: label on the right (LTR), the row is the target, and `accessibilityRole` + `accessibilityState.checked` set.

## 9. Progress indicators

| Type | Use |
| --- | --- |
| Indeterminate spinner | Unknown duration under ~10 s. Centre of the region it belongs to, not the screen. |
| Determinate bar | Known progress: uploads, KYC steps, multi-step flows. Always moves. |
| Step indicator | Flows with 3+ steps: "Step 2 of 4" plus a bar. |
| Skeleton | Content that will have a known shape. Preferred over spinners for lists and cards. |

Never fake progress. Never show a progress bar that stalls at 90%.

## 10. Skeleton loaders

- Mirror the final layout: same row heights, same number of blocks (3-5 for lists), same gutters.
- `skeleton.base` with a subtle shimmer (`skeleton.highlight`) at 1000-1400 ms per cycle, or a gentle opacity pulse. Disable animation under reduce-motion.
- Radius matches the real content (text lines = 4-8, avatars = pill).
- Never skeleton for less than ~300 ms - it flashes. Use a delay before showing.
- Never skeleton static chrome (headers, tab bars) - only data regions.

## 11. Toasts, snackbars, banners

See `toast-and-feedback.md`. Summary:
- **Toast/snackbar**: transient confirmation, bottom, above tab bar and safe area, 2-4 s, max one action ("Undo").
- **Banner**: persistent, contextual, top of the affected region, dismissible or resolvable ("You're offline", "Verify your email").
- **Never** an alert dialog for a message that requires no decision.

## 12. Bottom sheets, modals, dialogs

See `bottom-sheets.md` and `dialogs-and-modals.md`. Selection summary:

| Need | Use |
| --- | --- |
| A short focused sub-task keeping context | Bottom sheet |
| Pick one from a list | Bottom sheet (or native picker) |
| A blocking yes/no decision | Alert dialog |
| A multi-step or long task | Full-screen modal / new screen |
| Just informing | Toast or banner, never a dialog |

## 13. Search

- Placeholder states what is searched ("Search transactions").
- Debounce 250-350 ms; show results progressively; never block the field while searching.
- Clear button (x) appears when non-empty, 48 hit area.
- Show recent searches when empty and focused; show "No results for X" with a suggestion when empty result.
- Cancel affordance on iOS-style search; back arrow on Android-style.
- Never lose the query on navigation back.

## 14. Filters

- Show the active filter count on the entry point ("Filters · 2").
- Applied filters appear as removable chips above the results.
- A filter sheet always has "Clear all" and "Apply" (with the resulting count if cheap to compute: "Show 24 results").
- Filtered-empty is a different empty state from never-had-data.

## 15. Headers

- Height 56 content + top inset. Title `subtitle` (17/600), centred on iOS, leading-aligned on Android (both are acceptable if consistent app-wide).
- At most 2 trailing actions; a third goes into an overflow menu.
- Back: chevron (+ optional label on iOS), 48 hit area, at the leading edge.
- Collapsing/large titles: only on scroll-heavy root screens, and the collapsed title must match the large one.
- Header background becomes opaque with a hairline border or elevation 2 once content scrolls under it. Never leave text overlapping content.

## 16. Empty / error states inside components

Any component that can have no data owns its empty state - a list, a chart, a carousel. Do not let an empty region render as blank space. See `empty-states.md` and `error-states.md`.

## 17. Component API conventions (React Native)

```tsx
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};
```

Rules:
- Props are semantic (`variant`, `tone`), never stylistic (`color="#f00"`, `padding={12}`).
- Accept `style` for layout-only overrides (margin/width), never for visual identity.
- No component reaches into the theme with literals; everything through `useTheme()`.
- Every interactive component takes `testID` and forwards accessibility props.
- Memoise list rows (`React.memo` + stable callbacks) - see `performance.md`.
- Keep components under ~150 lines; extract sub-components rather than adding branches.
