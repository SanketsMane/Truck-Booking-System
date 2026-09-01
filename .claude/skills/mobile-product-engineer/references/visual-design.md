# Visual Design (Phase 3)

Turning the UX spec into something that looks intentional. Assumes hierarchy is already decided (`ux-architecture.md`).

## 1. Build hierarchy with the cheapest tool first

Ordered from strongest and cheapest to weakest and most expensive:

1. **Position** - top and left read first; the bottom third is the action zone.
2. **Size** - a 28 pt number next to 14 pt labels needs nothing else.
3. **Weight** - 700 vs 400 separates without adding a colour.
4. **Contrast** - `text.primary` vs `text.secondary` vs `text.tertiary` does most grouping work.
5. **Space** - 32 above a section says "new topic" more clearly than a divider.
6. **Colour** - reserved for meaning: brand, status, money direction.
7. **Surface / border / elevation** - only when content is genuinely separable.
8. **Decoration** - almost never.

If you find yourself adding a shadow to create hierarchy, you skipped steps 1-5.

## 2. Emphasis budget

Per screen you are allowed roughly:
- **1** rank-1 element (the big number, the title, the hero fact).
- **1** filled brand-coloured button.
- **2-3** accent usages total, including status colours.
- **1** elevated surface family.

Everything else is neutral. Scarcity is what makes emphasis work. Two filled brand buttons on one screen means neither is primary.

## 3. Grouping: spacing vs divider vs card

Use the lightest structure that works.

| Need | Use | Never |
| --- | --- | --- |
| Related fields in a form | 12-16 gap, one 24-32 gap between groups | A card per field |
| A list of similar rows | Rows + 1 px inset divider (or nothing if rows are tall) | A card per row |
| A titled section | 32 top margin + `overline`/`label` title | A card with a header bar |
| One genuinely separable object (a balance, an offer, an alert) | Card: `surface.raised`, radius 16, elevation 1 | Nesting more cards inside |
| Tap-to-open collection of rows | Grouped container with radius 16 and internal dividers | Individual cards with gaps |

**Card test:** could this object be moved, dismissed, reordered or opened as a unit? If not, it is a section, not a card. See `cards-and-surfaces.md`.

## 4. Composition

- **One gutter.** Everything aligns to the same left edge: 16/20/24 by width. Section labels, body text, row content, headers. The only exceptions are full-bleed images, dividers that intentionally run edge-to-edge, and horizontally scrolling carousels (which start at the gutter and bleed right).
- **Vertical rhythm.** Between sections 24-32, within a section 12-16, within a component 4-8.
- **Optical alignment.** Icons often need 1-2 px nudges to look centred against text; a period or currency symbol can require adjusting. Trust your eye over the number.
- **Alignment beats decoration.** Two columns aligned on the same baseline look designed; the same content in two boxes looks assembled.
- **Left column is content, right column is value or affordance.** In rows, keep the right edge consistent: amount, chevron, switch - but pick one per list.

## 5. Typographic composition

- Use at most **3 type sizes** in a component and **5** on a screen.
- Pair a size step with a contrast step: `title` in `text.primary` over `bodySmall` in `text.secondary`.
- Never use ALL CAPS for anything longer than two words, and only at `overline` with tracking.
- Line length is not usually a problem on phones, but at ≥600 dp width cap text blocks at ~640 dp.
- Numbers that stack must use tabular figures so digits align. See `typography.md`.

## 6. Colour composition

- Screens are **90% neutral**. Background, surface, text, border carry the layout; brand colour appears on the primary button and maybe one accent.
- Status colour is used at low saturation for backgrounds (`status.*.surface`) and full saturation for text/icons (`status.*.base`).
- Do not tint entire cards in brand colour to "add life". Add life with better hierarchy.
- Gradients: at most one, on one surface (usually a balance card), with a maximum of two adjacent hues and low contrast between stops. Never behind body text unless contrast is verified against both stops.
- Test every screen in dark mode as you build, not at the end. See `dark-mode.md`.

## 7. Shape and radius

- One radius family: 12 for controls, 16 for cards/sheets, pill for chips and avatars.
- **Nested radius rule:** inner radius = outer radius − padding. A 16 radius card with 12 padding holds a 4-radius child. Equal radii nested look wrong.
- Radius is not hierarchy. Do not vary radius to indicate importance.
- Full-bleed elements have square corners at the screen edge - a card touching both edges should have no side radius.

## 8. Elevation and shadow

Four levels, no more:

| Level | Use | iOS shadow | Android |
| --- | --- | --- | --- |
| 0 | Base surfaces, list rows, most sections | none, optional 1 px `border.subtle` | `elevation: 0` |
| 1 | Cards that need lift | y 1, blur 3, opacity 0.06 | `elevation: 1` |
| 2 | Sticky headers/footers over content, menus | y 2, blur 8, opacity 0.08 | `elevation: 3` |
| 3 | Sheets, dialogs, FAB | y 8, blur 24, opacity 0.12 | `elevation: 8` |

- In dark mode, shadows are nearly invisible - convey elevation by **lightening the surface** instead. See `dark-mode.md`.
- Never clip shadows: a shadowed child inside `overflow: hidden` loses its shadow on Android and gets cut on iOS.
- Android needs a background colour for `elevation` to render.
- Prefer borders to shadows for quiet separation; prefer nothing to borders.

## 9. Imagery and illustration

- Images have a defined aspect ratio and a placeholder of the same size - no layout shift on load.
- Avatars: circle, with initials fallback on a deterministic tinted background. Never a broken-image icon.
- Illustrations only in empty states, onboarding and success screens, at a restrained size (120-200 dp), in the app's palette.
- Never stretch; use `cover` with a defined ratio, `contain` only for logos.
- Full-bleed hero images need a scrim or a solid band behind any text on them.

## 10. Density and breathing room

- Comfortable does not mean empty. A screen that requires scrolling to see two items is under-designed.
- If a screen looks bare, the fix is usually **more content or a bigger rank-1 element**, not more padding.
- If a screen looks noisy, the fix is usually **fewer borders, fewer colours, fewer sizes**, not more padding.
- Check the fold: on a 667 pt tall screen (iPhone SE), rank 1 and the primary action should both be visible without scrolling on hub screens.

## 11. Interaction states, visually

Every interactive element needs a defined appearance for each state it can reach:

| State | Treatment |
| --- | --- |
| Default | Base tokens |
| Pressed | iOS: opacity 0.7 (or scale 0.97 for cards) / Android: ripple. Filled buttons: darken via `brand.primaryPressed` |
| Disabled | 38-40% opacity or `text.disabled` + `surface.subtle`; never remove it from the layout |
| Loading | Spinner replaces the label, width preserved, element non-interactive |
| Selected | Filled tint + border + weight change (not colour alone) |
| Focused | 2 px `border.focus` (needed for keyboards/TV/accessibility) |
| Error | `status.error` border + message below; never colour alone |

## 12. Self-review before implementing

Sketch mentally and check:
- Squint: do rank 1 and 2 still stand out as shapes?
- Grayscale: does hierarchy survive without colour?
- Count sizes, weights, colours, radii, shadows. Over budget? Cut.
- Is there a single alignment edge?
- Is anything decorative? Remove it and see if the screen got worse.
