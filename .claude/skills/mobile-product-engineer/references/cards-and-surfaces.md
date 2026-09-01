# Cards & Surfaces

Card overuse is the number one visual symptom of AI-generated mobile UI. This file is the decision procedure.

## 1. The card test

Use a card **only** if the content passes at least two:

1. **Separable object** - it represents one thing (an account, an offer, a document) that could exist elsewhere.
2. **Independently actionable** - tapping it does something distinct.
3. **Reorderable / dismissible / repeatable** - it is one of several peers, or the user can remove it.
4. **Visually distinct content type** - it needs a different background to be understood (a balance panel, a warning).

Fails the test -> use a **section**: a heading plus content on the canvas, separated by space.

| Content | Verdict |
| --- | --- |
| "Personal details" fields on a profile screen | Section (or grouped rows), not a card |
| A wallet balance with actions | Card - it is a distinct object with its own actions |
| Each settings row | Grouped container, one per group, not one per row |
| A list of transactions | Rows, not cards |
| A promotional offer among several | Card |
| A single form on a screen | No card - the screen is the container |
| A chart with a title | Section |
| An alert about a failed payment | Card/banner with `status.*.surface` |

## 2. Surface levels

Three levels, maximum:

```
bg.canvas        the screen
surface.default  a plane on the canvas (grouped rows, sheets)
surface.raised   an object above that plane (cards, dialogs, FAB)
surface.sunken   an inset well (input backgrounds, code blocks) - the exception, not a level
```

Rules:
- Never place a raised surface on a raised surface. If you need a highlight inside a card, use `surface.sunken` or a border, never another card.
- In light mode, `surface.default` is usually white on an off-white canvas - the canvas being slightly grey is what makes surfaces read.
- In dark mode, surfaces get *lighter* with elevation. See `dark-mode.md`.

## 3. Card anatomy

```
Card:  surface.raised · radius lg (16) · padding 16-20 · elevation 0-1 · gap 12
  [optional leading icon/avatar 40]
  Title            subtitle/bodyStrong
  Body             bodySmall text.secondary (max 2-3 lines)
  Value            amountM/amountL if numeric
  [one action]     text/secondary button, or the whole card is the action
```

- **One action per card.** Two competing actions mean it should be a screen or a section.
- Whole-card tap targets need a pressed state (`scale 0.98` + `overlay.pressed`) and `accessibilityRole="button"` with a label describing the whole card.
- Full-bleed media inside a card: image at the top with the card's top radius, square bottom, and content padded below.
- Cards in a horizontal carousel: fixed width ~78-85% of screen width so the next card peeks; 12 gap; snap to the gutter with `snapToInterval`.

## 4. Grouped rows (the settings pattern)

Better than individual cards for related rows:

```
Section label (overline, text.secondary, gutter aligned)
[ surface.default container, radius lg, overflow hidden
    Row 1   (56 tall, 16 padding)
    -------- 1px border.subtle, inset 16
    Row 2
    Row 3
]
32 gap
Next section
```

- Full-width variant (no radius, edge-to-edge) is also valid and reads as more "system-like" on Android. Pick one and use it app-wide.
- Never put a shadow on a grouped container that touches the screen edges.

## 5. Borders vs shadows vs nothing

Preference order: **nothing > space > border > shadow.**

| Need | Use |
| --- | --- |
| Separate two sections | 32 gap |
| Separate rows | 1 px inset border |
| Lift a genuinely floating object | elevation 1 |
| Sticky header/footer over scrolling content | elevation 2 or a hairline border, applied only once content scrolls under |
| Sheets, dialogs, FAB | elevation 3 |

Do not combine a visible border **and** a shadow on the same element - pick one.

## 6. Shadow implementation

```tsx
// Cross-platform elevation helper (in the theme, not in components)
const shadow = (level: 1 | 2 | 3) => Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: SH[level].y },
         shadowRadius: SH[level].blur, shadowOpacity: SH[level].opacity },
  android: { elevation: SH[level].elevation },
});
```

Rules:
- Android requires an opaque `backgroundColor` for `elevation` to render.
- `overflow: 'hidden'` clips shadows. If a card needs both rounded clipping of an image and a shadow, use two views: an outer shadow view and an inner clipping view.
- Never apply shadows to list rows - it kills scroll performance and looks noisy.
- In dark mode, reduce shadow opacity to near zero and rely on surface lightness.

## 7. Radius consistency

- Cards and sheets: 16. Controls: 12. Chips/avatars: pill. Small tiles: 8-12.
- Nested: inner radius = outer − padding, minimum 4.
- Elements touching a screen edge lose the radius on that edge.
- Never vary radius to signal importance.

## 8. Balance / hero panels (fintech)

The one place a decorated surface is justified:
- A single accent surface (solid brand, or a two-stop gradient) holding the primary balance.
- White/`text.onBrand` typography, verified for contrast at every gradient stop.
- Actions inside it are secondary-styled (translucent white) so the panel does not fight the screen's primary CTA.
- One per screen. Never two competing accent panels.
- Keep the balance readable when the value is long (₹12,34,567.89) - test with the largest realistic value.

## 9. Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Every section wrapped in a card | Sections with labels and spacing |
| Card inside a card | Flatten; use `surface.sunken` or a border for the inner block |
| Card per settings row | One grouped container per section |
| Shadow + border + radius + gradient on one element | Pick one visual treatment |
| Cards with 4 actions | It is a screen |
| Cards floating on a white background with heavy shadows | Tint the canvas so surfaces read without shadows |
| Different radii and paddings per card | One card component, used everywhere |
| Cards used to hide bad hierarchy | Fix the hierarchy |
