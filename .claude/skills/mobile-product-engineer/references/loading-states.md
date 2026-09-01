# Loading States

Perceived performance is a design problem more than an engineering one.

## 1. Choose by expected duration

| Duration | Treatment |
| --- | --- |
| < 300 ms | Nothing. Showing then hiding a spinner is a flash and reads as jank. |
| 300 ms - 2 s | Skeleton (known layout) or an inline spinner in the affected region |
| 2 - 10 s | Skeleton/spinner + a reassuring line after ~3 s ("Checking with your bank...") |
| > 10 s | Determinate progress if possible, or a status screen with the ability to leave and be notified |
| Unknown, backgroundable | Optimistic UI + background sync indicator |

Implement the 300 ms rule with a delay: start a timer, show the loader only if the request is still pending when it fires; on resolve, clear the timer.

## 2. Skeletons over spinners

Use skeletons whenever the resulting layout is known:
- Same row heights, same gutters, same count as a realistic first page (3-5 rows).
- Text lines as rounded bars (radius 4-8) at ~60-90% width, varied per line so it does not look like a table.
- Avatars as circles, images as the exact aspect ratio.
- Never skeleton the chrome (header, tab bar, static labels) - only the data.
- Shimmer: 1000-1400 ms sweep or a 0.5 -> 1.0 opacity pulse. Disable under reduce-motion (static `skeleton.base` is fine).

The skeleton must match the loaded layout closely enough that nothing jumps when data arrives. A skeleton that causes a layout shift is worse than a spinner.

## 3. Region-level, not screen-level

A screen is not one request. Each region loads and fails independently:

```
Balance card    -> its own skeleton, its own error, its own retry
Quick actions   -> static, no loading
Recent activity -> its own skeleton and empty state
Rewards widget  -> hidden entirely if it fails (non-essential)
```

Never blank an entire screen because one secondary widget is slow. Never gate the primary content behind a non-essential request.

## 4. Refresh vs initial load

| Situation | Behaviour |
| --- | --- |
| First load, no cache | Skeleton |
| Returning with cache | Show cached data immediately, refresh silently, update in place |
| Pull-to-refresh | Keep content, show the platform refresh indicator only |
| Background refresh on focus | No visible loader; update in place. If values change materially (a balance), animate the change subtly |
| Manual retry after error | Replace the error block with a loader in the same position |

Never replace visible content with a skeleton on refresh. It reads as data loss.

## 5. Button and action loading

- Spinner replaces the label inside the button; the button keeps its width and height.
- Button becomes non-interactive and `accessibilityState={{ busy: true, disabled: true }}`.
- For destructive or money operations, remain in the loading state until the server confirms - never optimistically navigate.
- If it exceeds ~8 s, add supporting text below the button rather than leaving a mute spinner.

## 6. Optimistic UI

Use when the operation almost always succeeds and is cheap to reverse: likes, toggles, marking read, reordering, adding to a local list.

Do **not** use for: payments, transfers, withdrawals, KYC submission, anything with a server-assigned identifier the user will see, anything irreversible.

Pattern: apply locally -> queue the request -> on failure revert with an explanatory message and an offer to retry. Never silently drop a failed optimistic update.

## 7. Pagination and infinite scroll

- Footer spinner, 48-56 tall, centred.
- Failure becomes a footer "Couldn't load more · Retry" row - never a full-screen error.
- Never show a loader for a page the user has already scrolled past.
- Prefetch one page ahead at 50% of the current page for a seamless feel.

## 8. Full-screen loading

Acceptable only for:
- App boot/splash while restoring the session (with a hard timeout and a failure path).
- A blocking operation the user explicitly started that must complete (payment processing).

Requirements: brand-consistent, a message explaining what is happening, and never dismissible by accident. For payments, explicitly warn "Don't close the app" and disable back.

## 9. Perceived performance techniques

- Render the shell (header, tabs, static labels) instantly; fill data in.
- Cache the last known values and show them immediately, marked stale if accuracy matters.
- Prefetch on intent: start loading the detail when the user presses the row, not when the screen mounts.
- Keep animations running during loads - a frozen UI feels broken even at the same latency.
- Transition into loaded state with a short fade (140-220 ms) rather than a hard swap.
- Reserve space so nothing reflows: fixed image ratios, fixed row heights, min-heights on variable regions.

## 10. Accessibility

- `accessibilityState={{ busy: true }}` on the loading region or button.
- Announce meaningful state changes: "Loading transactions", then "24 transactions loaded". Do not announce every skeleton.
- Screen-reader users must not be trapped in a loading region; keep the header and back reachable.
- Under reduce-motion, static loaders only.

## 11. Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Full-screen spinner for a 200 ms request | Nothing, or delay the loader |
| Blanking the screen on refresh | Keep content, refresh in place |
| Skeleton shaped differently from the content | Match the real layout |
| One failed widget kills the whole screen | Region-level states |
| Fake progress bars | Indeterminate, or real progress |
| Spinner with no timeout | Always have a failure path |
| Optimistic payment confirmation | Wait for the server |
| Loader on a button that changes size | Preserve dimensions |
