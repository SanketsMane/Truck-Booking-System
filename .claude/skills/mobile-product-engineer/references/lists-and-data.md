# Lists & Data Display

Most mobile apps are mostly lists. This is where performance and polish are won.

## 1. Choosing the container

| Data | Use |
| --- | --- |
| < 20 static items, no recycling needed | `ScrollView` + `map` (or `FlatList` for consistency) |
| Any dynamic or long list | `FlatList` |
| Very long, heterogeneous, or performance-critical | `@shopify/flash-list` |
| Grouped by date/category | `SectionList` or FlashList with sticky headers |
| Grid | `FlatList numColumns` with `columnWrapperStyle` gap |

Never render a long list inside a `ScrollView`, and never nest a `FlatList` vertically inside a `ScrollView` (it breaks virtualisation). If you need a header, use `ListHeaderComponent`.

## 2. Row design

Heights: 56 standard, 64 two-line, 72 transaction (avatar + title + subtitle + amount).

- Leading: 40 avatar or a 40 container holding a 20-24 icon.
- Title: `body`/`bodyStrong`, one line, truncating.
- Subtitle: `bodySmall` `text.secondary` - category, time, or status. One line.
- Trailing: amount (`amountS`, tabular, right-aligned) **or** chevron **or** switch. Pick one type per list.
- Whole row pressable with a pressed state, 48 minimum height.
- Separators: 1 px `border.subtle` inset to the title's left edge, or none for tall rows.

## 3. Grouping and section headers

- Group transactions and activity by date: "Today", "Yesterday", then "12 March" / "March 2025" for older.
- Section header: `overline` or `label` in `text.secondary`, 8-12 below, 24 above, on `bg.canvas` (not inside a card).
- Sticky headers for long lists (`stickySectionHeadersEnabled`); give them an opaque background so rows do not show through.
- Optionally show a per-section summary (e.g. daily total) when it aids scanning.

## 4. Loading, empty, error

Every list has all four states. See `loading-states.md`, `empty-states.md`, `error-states.md`.

```
initial load  -> skeleton rows (3-5) matching row height, no spinner
refresh       -> RefreshControl only; keep existing rows visible
pagination    -> footer spinner; on failure a footer "Retry" row, never a full-screen error
empty         -> centred illustration/icon + title + one line + primary action
filtered-empty-> "No results for 'x'" + Clear filters
error         -> centred message + Retry; keep header and filters usable
offline       -> cached rows + a persistent "Offline - showing saved data" banner
```

## 5. Pagination

- Infinite scroll for feeds and activity: `onEndReachedThreshold={0.5}`, guard with an `isLoadingMore` ref so it fires once.
- Explicit "Load more" when the user needs a stopping point (statements, search results with counts).
- Show the total when it is meaningful ("248 transactions").
- Never reset scroll position when appending.
- Cursor-based pagination beats offset for live data (no duplicates or skips when new items arrive).

## 6. Pull-to-refresh

- Standard on any list showing server data. `RefreshControl` with `tintColor`/`colors` set from theme tokens.
- Refresh must be visibly different from initial load: content stays, indicator shows.
- Include a haptic on trigger (`impactLight`) on iOS.
- Do not use pull-to-refresh as the *only* way to refresh; also refresh on screen focus and after relevant mutations.

## 7. Swipe actions

- Maximum two actions per side. Destructive action goes on the right (LTR) with a distinct colour and an icon + label.
- Require a full swipe or a tap on the revealed button - never fire on a light swipe.
- Destructive swipes need undo (snackbar, 4-5 s) or a confirmation.
- Always provide a non-gesture path to the same action (row detail, long-press menu) - swipe is inaccessible to screen-reader users.
- Implement with `react-native-gesture-handler`'s Swipeable or Reanimated; ensure it does not fight the navigation back gesture near the screen edge.

## 8. Selection mode

- Enter via long-press (with haptic) or an explicit "Select" action.
- Header changes to show the count and contextual actions; back exits selection.
- Selected rows get a check, a tint, and `accessibilityState.selected`.
- Provide "Select all" when the list is bounded.

## 9. Search and filter within lists

- Search bar in `ListHeaderComponent` (scrolls away) or sticky under the header (persistent) - persistent for lists over ~50 items.
- Filter chips row directly under the search field, horizontally scrollable, showing the applied filters.
- Show result counts after filtering.
- Preserve query and filters on navigating to a detail and back.

## 10. Performance rules

```tsx
const renderItem = useCallback(({ item }) => <Row item={item} onPress={onPress} />, [onPress]);
const keyExtractor = useCallback((item) => item.id, []);

<FlatList
  data={data}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  ItemSeparatorComponent={Separator}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={7}
  removeClippedSubviews  // Android; verify no clipping artefacts
  getItemLayout={fixedHeight ? getItemLayout : undefined}
/>
```

- `React.memo` every row component, with primitive props or stable references.
- Never create inline functions/objects in `renderItem` props.
- Fixed row heights + `getItemLayout` (FlatList) or `estimatedItemSize` (FlashList) remove measurement jank.
- Keys are stable IDs, never array indices.
- Images in rows: fixed dimensions, cached (`expo-image` or `react-native-fast-image`), with a placeholder of the same size.
- Move heavy formatting (currency, dates) out of render or memoise the formatter - creating an `Intl.NumberFormat` per row is a real cost.
- More in `performance.md`.

## 11. Tables and dense data (the web trap)

Do not port a data table to mobile. Instead:
- Convert each row into a two-line list row: identity + primary value.
- Move remaining columns into the detail screen.
- If a true matrix is unavoidable (a statement), use a horizontally scrollable region with a frozen first column, an explicit scroll hint, and a "download/share PDF" escape hatch.
- Never shrink text below 12 to fit columns.

## 12. Charts and summaries

- One chart per screen region, with the key figure stated in text above it - the number is the content, the chart is support.
- Label axes minimally; prefer direct labels on the data over legends.
- Touch targets on data points must be >= 44; support tap-to-inspect rather than hover.
- Provide an accessible text summary (`accessibilityLabel` describing the trend) - charts are invisible to screen readers.
- Never use colour alone to distinguish series.

## 13. List checklist

- [ ] All four states implemented and viewed
- [ ] Row height consistent; one trailing element type
- [ ] Rows memoised, stable keys, no inline closures
- [ ] Bottom padding clears tab bar and home indicator
- [ ] Pull-to-refresh keeps content visible
- [ ] Pagination fires once and preserves scroll
- [ ] Swipe actions have a non-gesture equivalent and undo
- [ ] Long titles truncate; amounts never do
- [ ] Scroll position restored on back
- [ ] 60 fps while flinging with real data volume
