# Example — Dashboard / analytics screen

The screen most likely to become a web dashboard by accident. This example is largely about what **not** to bring across.

---

## Phase 1 — Understand

**Requirement:** "A dashboard showing the user's spending."

| Question | Answer |
| --- | --- |
| One job | Answer "where is my money going?" at a glance |
| User | Reviewing spending, usually monthly, often idly |
| Most important information | Total spent this period, and the biggest category |
| Primary action | Change the period (month) |
| Secondary actions | Drill into a category, change the chart type, export |
| Edge cases | No spending yet; one transaction only; a single category dominating; very long category names; a period with no data |

**Decision:** on mobile this is *one headline number plus a ranked list*, with a chart supporting it. Not a grid of tiles.

## Phase 2 — UX architecture

```
1  Period selector + total spent      the headline
2  Chart (one, supporting)            shape of the spending
3  Category breakdown, ranked         the actual answer
4  Comparison to last period          context
5  Drill-in / export                  secondary
```

Navigation: a tab, or pushed from Activity. Tapping a category pushes a filtered transaction list.

Interaction: horizontal swipe or a segmented control to change period. Tapping a chart segment selects the matching category row (and vice versa) — the two must stay in sync or they read as unrelated.

States:

| State | Behaviour |
| --- | --- |
| Loading | Skeleton the total, the chart area and 5 category rows |
| Empty (no spending this period) | "No spending in March" + a period switcher, not a generic empty screen |
| Empty (new user) | Explain what will appear here + [Make your first payment] |
| Error | Inline retry; do not blank the period selector |
| Single category | Chart still renders sensibly; do not show a donut that is one solid ring with no legend |

## Phase 3 — Visual design

| Element | Decision |
| --- | --- |
| Period selector | Segmented control (3 options) or a month stepper `‹ March 2026 ›`. Not a dropdown — a dropdown hides the current value's neighbours. |
| Total | `amountXL` 36/42, tabular. Below it, `bodySmall` comparison: "↓ 12% vs February" with an arrow icon **and** the word, never colour alone. |
| Chart | **One** chart, ~180–220 tall. Donut for composition; bar for time comparison. Never both on one screen. |
| Category rows | Rank order, 56 tall: colour dot · name · amount right-aligned · percentage in `caption` beneath the amount. A thin progress bar behind the row is acceptable if it stays subtle. |
| Density | 5–6 categories visible, then "See all". A phone should not show 20 rows of analytics above the fold. |
| Colour | A dedicated categorical chart palette, distinguishable in greyscale by order and label. Chart colours must be the row dot colours — identical, not "similar". |
| Spacing | Gutter 16. Total section 24/24. Chart 24 below. Rows in one container. |

**Rejected:**
- A 2×2 grid of stat tiles — four numbers of equal weight means no headline.
- A data table with columns — unreadable on a phone; rows are the mobile equivalent.
- Three charts stacked — one screen answers one question.
- A sparkline in every row — noise at this size.
- Percentage-only labels with no amounts — users think in currency.

## Phase 4 — Platform adaptation

| | Android | iOS |
| --- | --- | --- |
| Period control | Material-style segmented / chips | Segmented control |
| Chart interaction | Tap segment → ripple on the linked row | Tap segment → row highlights, selection haptic |
| Header | Small top app bar with an export overflow `⋮` | Large title, export in the nav bar or a menu |
| Swipe between periods | Works with the back gesture (`activeOffsetX` tuned so it does not fight the edge) | Must not conflict with the left-edge back swipe — restrict the swipe zone or use the stepper only |

## Phase 5 — Implementation notes

- Chart library: use what the project already has. `react-native-svg` + hand-drawn arcs is often enough for a donut and avoids a heavy dependency. Do not add Victory/Recharts-scale libraries for one donut.
- Aggregate spending **once** when data arrives, memoised — never inside `renderItem`.
- Category colours come from a fixed, ordered palette keyed by category id, so a category is the same colour every month.
- Chart and list share one `selectedCategory` state.
- Chart needs an accessible summary: `accessibilityLabel="Spending by category: Food 32%, Transport 21%..."` — an SVG donut is invisible to a screen reader otherwise.

## Phase 6 — Visual QA findings

| Found | Fix |
| --- | --- |
| Chart colours drifted from the row dots | Both now read from one `categoryColors` map |
| Donut unreadable in dark mode | Added a dark chart palette and lightened the segment borders |
| Long category names truncated mid-word | Row switched to two lines with the amount right-aligned |
| Comparison shown in green/red only | Added an arrow icon and the word "less"/"more" |
| Chart had no screen-reader representation | Added a summary label and made rows the accessible path |
| At 2.0× font scale the segmented control clipped | Switched to the month stepper below 400 dp at large scales |

## Rules for any mobile dashboard

1. **One headline number**, not a grid of equals.
2. **One chart**, supporting a ranked list.
3. **Rows, not tables.**
4. Chart colours and list colours are the same values, from one source.
5. Every chart needs a text equivalent for screen readers.
6. Amounts, not just percentages.
7. Drill-in is the answer to "more detail", not more density.
8. Verify in dark mode — charts are the most common dark-mode failure.
