# Responsive mobile

Mobile-first means designed for the smallest realistic screen and one hand, then allowed to breathe on larger ones. It never means a shrunken desktop layout.

## 1. Breakpoints

Width in dp/pt (logical pixels), not device names:

```
compact    < 400    small phones (iPhone SE, budget Android)
standard   400–599  the vast majority of phones
large      600–839  large phones landscape, small tablets, unfolded foldables
expanded   ≥ 840    tablets, desktop-class
```

Corresponding gutters: `16 / 20 / 24 / 24 with max content width 640`, centred.

Beyond ~640 dp, **stop stretching content**. A full-width text column on a tablet is unreadable. Cap the column and centre it, or move to a two-pane layout.

## 2. What changes per breakpoint

| | compact | standard | large / expanded |
| --- | --- | --- | --- |
| Gutter | 16 | 20 | 24 |
| Grid | 1 col | 1 col | 2 cols, or list + detail |
| Cards per row | 1 | 1–2 | 2–3 |
| Quick actions | 4 | 4 | 6–8 |
| Navigation | bottom tabs | bottom tabs | rail / persistent sidebar |
| Modals | full-screen / sheet | sheet | centred dialog |
| Type scale | −1 step on display sizes | base | base (do not inflate body) |

Body text stays ~16 pt everywhere. Larger screens get more *content* and more *whitespace*, not bigger paragraphs.

## 3. Small screens (< 400 dp, or < 700 dp tall)

The real constraint is often **height**, not width. Verify:

- The primary CTA is visible without scrolling on the main task screen.
- Hero/balance blocks shrink rather than pushing everything below the fold.
- Long labels wrap instead of truncating.
- 4 items in a row still leaves ≥ 48 dp targets: `(360 − 32 gutter − 3×12 gaps) / 4 = 73` — fine. 5 items at 360 dp is tight; 6 does not fit.
- Bottom sheets do not exceed ~90% height.

Test at 320×568 (smallest realistic) and 360×640 (very common Android).

## 4. Implementation

```tsx
const { width, height } = useWindowDimensions(); // re-renders on rotate/fold — Dimensions.get() does not
```

- Prefer **flex** and `gap` over percentage widths or absolute positioning.
- Use `minHeight`, never fixed `height`, on anything containing text.
- Compute grid item widths from the container, not the screen: `(containerWidth - gutter*2 - gap*(cols-1)) / cols`.
- `flexWrap` for chip/action rows so they wrap gracefully at large font scales.
- `numberOfLines` with `ellipsizeMode` only where truncation is genuinely acceptable — never on money, names in a confirmation, or error messages.
- Scale spacing in **steps** from the token scale, never by a continuous ratio of screen width.

## 5. Orientation

Decide explicitly: most consumer and fintech apps lock to portrait, and that is a legitimate choice. If landscape is supported:

- Two-column where it helps; never just stretch.
- Headers shrink; large titles collapse.
- Keyboard leaves very little room — forms need scroll and a compact layout.
- Horizontal safe-area insets become non-zero. -> `safe-areas.md`

Locking orientation is fine. Silently breaking in landscape is not.

## 6. Tablets and foldables

- Do not ship a stretched phone layout. Either cap the content width and centre, or build a genuine two-pane (list + detail) layout.
- Bottom tabs → navigation rail at ≥ 600 dp.
- Sheets → centred dialogs or popovers.
- Foldables change size **at runtime**: state must survive the configuration change, and layout must recompute from `useWindowDimensions`. -> `android.md`
- Test the folded (often very narrow, ~320 dp) *and* unfolded states.

## 7. Density and pixel ratio

- Assets at 1×/2×/3×, or vector (SVG) icons. Blurry icons on a 3× device are an immediate quality tell.
- `PixelRatio.roundToNearestPixel()` for hairlines; `StyleSheet.hairlineWidth` for 1px dividers.
- Never assume a specific pixel density.

## 8. Dynamic content

Layouts must survive real data:

| Case | Requirement |
| --- | --- |
| Very long name / merchant / address | Wraps or truncates gracefully; never overlaps |
| Very large amount (₹12,34,567.89) | Fits, or scales down — never truncates |
| Empty string / missing field | Placeholder or the row collapses cleanly |
| 0 items | Empty state -> `empty-states.md` |
| 1 item | Not a broken-looking grid |
| 1000 items | Virtualised -> `lists-and-data.md` |
| RTL locale | Mirrored layout, `start`/`end` instead of `left`/`right` |
| Long translations (German ~30% longer) | No clipping |

Test with the ugliest realistic data, not with "John Doe".

## 9. One-handed use

- Primary actions live in the **bottom third**. The top-right corner is the hardest place to reach on a large phone.
- Destructive actions never sit next to a frequently-tapped control.
- Bottom sheets beat top-anchored dropdowns for reachability.
- Back/close is top-left (unreachable by design — that is fine, it is not frequent) *and* mirrored by the system back gesture.
- Long scrolling screens should not put the only CTA at the very bottom of a 3-screen scroll; pin it.

## 10. Checklist

- [ ] 320 dp wide and 360×640 verified
- [ ] Largest supported device verified
- [ ] Tablet: content capped or two-pane, not stretched
- [ ] Rotation (if supported) does not break or lose state
- [ ] Font scale 2.0× reflows at every breakpoint
- [ ] Longest realistic strings do not clip or overlap
- [ ] Grid maths derived from container width
- [ ] No fixed heights on text containers
- [ ] Primary action reachable one-handed
- [ ] RTL verified if the app ships an RTL locale
