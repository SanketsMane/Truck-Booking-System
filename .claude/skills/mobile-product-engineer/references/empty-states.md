# Empty States

The first screen a new user sees is usually empty. It is a product surface, not a fallback.

## 1. Types (they are not interchangeable)

| Type | Message | Action |
| --- | --- | --- |
| **First use** - never had data | Explain what will appear here and why it is useful | The action that creates the first item |
| **Cleared** - user emptied it | Confirm the state positively ("All caught up") | None, or a way back to the source |
| **No results** - search/filter | "No results for 'xyz'" | Clear filters / adjust search / suggestions |
| **Blocked** - permission or eligibility | Explain what is missing and the consequence | Grant permission / complete KYC |
| **Error masquerading as empty** | Never do this | Show an error state with retry |

Distinguishing first-use from filtered-empty is the most commonly skipped detail; the copy and the action differ completely.

## 2. Anatomy

```
[48-64 top space]
[optional illustration 120-160, or an icon 32-40 in a 64-72 tinted circle]
[16-24]
Title            title (22/700) or subtitle - 3-6 words, states the situation
[8]
Description      bodySmall, text.secondary, 1-2 lines, max ~140 chars, centred
[24]
Primary action   button, hug-content or full width if it is the screen's main CTA
[8-12]
Secondary link   text button, optional
```

Centre the block vertically in the available space when the empty state owns the screen; place it inline (top-aligned, smaller) when only one region is empty.

## 3. Copy

- **Title:** situation, not apology. "No transactions yet", "Nothing to review", "No cards added".
- **Description:** what will appear here, or what to do. "Your payments will show up here once you send or receive money."
- **Action label:** the verb that creates data. "Add money", "Send your first payment", "Add a card".
- Never: "No data", "Empty", "Nothing here", "Oops!", or an error tone for a normal state.
- Never blame the user ("You haven't added anything").
- Keep it under two lines; nobody reads an empty-state paragraph.

## 4. Visual restraint

- One illustration maximum, in muted palette tones, 120-160 tall. If no illustration system exists, use a single icon in a tinted circle - it looks deliberate and costs nothing.
- Never a stock illustration in a different style from the rest of the app.
- Never a giant emoji.
- The empty state should be quieter than a populated screen, not louder.

## 5. Placement rules

| Context | Treatment |
| --- | --- |
| Whole screen (a tab with no data) | Centred full block with the primary action |
| A section inside a screen (recent activity) | Compact inline block: icon 24 + one line + a text action; do not centre a 400 px block inside a card |
| A list after filtering | Inline, at the top of the results area, with "Clear filters" |
| A widget that is non-essential | Hide the widget entirely rather than showing an empty box |
| A dropdown/picker with no options | One row explaining why, plus the action to add options |

Never render an empty container with a fixed height and nothing in it.

## 6. Keep the surroundings usable

- The header, search field and filters stay visible and functional in a filtered-empty state - the user needs them to recover.
- Pull-to-refresh must still work on an empty list (`ScrollView` with `flexGrow: 1` inside a `RefreshControl`, or `ListEmptyComponent` with `contentContainerStyle={{ flexGrow: 1 }}`).
- Tab bars and navigation are never hidden by an empty state.

## 7. Implementation

```tsx
<FlatList
  data={items}
  contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
  ListEmptyComponent={
    isLoading ? <ListSkeleton /> :
    error     ? <ErrorState onRetry={refetch} /> :
    query     ? <NoResults query={query} onClear={clearFilters} /> :
                <FirstUse onAction={onCreate} />
  }
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
/>
```

Order matters: loading, then error, then filtered, then first-use. Getting this order wrong is how "No results" appears while data is still loading.

## 8. Onboarding value

For first-use empties, consider going beyond a single action:
- Two or three suggested next steps as rows ("Add money", "Link a bank account", "Invite a friend").
- Sample/demo content clearly labelled as an example, if it genuinely aids comprehension - never fake data that could be mistaken for real balances.
- Progress toward setup ("2 of 4 steps complete") if the account requires setup before the feature works.

## 9. Accessibility

- Title and description are readable in order; the illustration is decorative and hidden from the reader.
- The action is a real button with a descriptive label.
- Announce the transition to an empty state after a filter change (`accessibilityLiveRegion="polite"`), otherwise a screen-reader user has no idea the list changed.
- Contrast holds for the muted description text (`text.secondary`, not `text.tertiary`).

## 10. Checklist

- [ ] First-use, cleared, no-results and blocked handled distinctly
- [ ] Errors never render as empty
- [ ] Copy states the situation and offers a real action
- [ ] Illustration restrained and on-brand, or a simple tinted icon
- [ ] Filters/search remain usable
- [ ] Pull-to-refresh works while empty
- [ ] Inline empties are compact, not centred giants
- [ ] Announced to screen readers on change
