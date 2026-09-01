# UX Architecture (Phase 2)

Structural decisions, made before a single style. Output of this phase is a short written spec - hierarchy, states, actions, navigation.

## 1. The screen spec

Write this before coding. Ten lines is enough.

```
Screen:        Wallet
Job:           Know my balance and act on it in under 5 seconds
Primary user:  Returning user checking money, usually one-handed
Rank 1:        Available balance
Rank 2:        Add money / Send (primary actions)
Rank 3:        Recent transactions (last 5)
Rank 4:        Pending balance, rewards teaser
Primary CTA:   Add money
Secondary:     Send, Request, See all transactions
Destructive:   none
Entry:         Tab bar (root), deep link from push
Exit:          Transaction detail, Add money flow, All transactions
States:        loading (skeleton) | empty (no txns) | error (balance failed, txns failed - independently) | offline (cached balance + stale badge)
Edge cases:    balance hidden, very large amount, currency, negative balance, unverified KYC
```

## 2. Information hierarchy

Rank every element 1..n. Nothing is unranked; unranked elements are how screens become noisy.

Ranking questions, in order:
1. What does the user open this screen to find out? -> Rank 1.
2. What will they do about it? -> Rank 2 (the primary action).
3. What supports the decision? -> Rank 3.
4. What is occasionally useful? -> Rank 4, collapsed, secondary or moved off-screen.
5. What is here because it exists in the API? -> Delete it.

Express rank with, in order of strength: **position > size > weight > colour/contrast > space around it > decoration**. Reach for decoration last, if ever.

Common ranking mistakes:
- Promoting what is technically interesting (IDs, timestamps, statuses) over what is humanly interesting (who, how much, did it work).
- Giving equal weight to four "quick actions" when one is used 80% of the time.
- Burying the primary action below the fold.
- Placing a marketing banner above the content the user came for.

## 3. Screen archetypes

Pick the archetype first; it settles most layout questions.

| Archetype | Structure | Primary action | Examples |
| --- | --- | --- | --- |
| **Hub / Home** | Identity + key metric + 3-4 actions + recent activity | Top action, prominent | Wallet, dashboard |
| **List / Browse** | Search/filter + list + pagination | Row tap; FAB or header action for create | Transactions, orders, chats |
| **Detail** | Hero fact + attributes + actions + related | Sticky bottom bar or contextual | Transaction, product, profile |
| **Form / Input** | Fields grouped, one column, sticky submit | Sticky bottom CTA | Send money, KYC, address |
| **Flow step** | Progress + one decision + Continue | Full-width Continue | Onboarding, checkout, KYC |
| **Confirmation** | Outcome + amount + key details + next steps | Done / primary next action | Payment success, receipt |
| **Settings** | Grouped rows with labels | None; rows are the actions | Profile, preferences |
| **Empty / Zero** | Explanation + one action | The action that creates data | New user home |

Anti-archetype: the "everything" screen - hero + stats + carousel + tabs + list. If your screen has more than three archetypes in it, split it.

## 4. Layout skeleton

Standard vertical order for a mobile screen:

```
[status bar area - transparent, edge-to-edge]
[header: back/title/action  - 56 dp content + top inset]
[scrollable content         - gutter padding, 16-24 between sections]
  [rank 1 block]
  [primary actions]
  [section 1: label + content]
  [section 2: label + content]
[sticky footer if a single decision is required - CTA + bottom inset]
[tab bar if root - 56 dp content + bottom inset]
```

Rules:
- One scroll container per screen. Never nest vertical scrolls.
- The primary CTA is either in the sticky footer (decision screens) or in the top third of the content (hub screens with multiple actions).
- Sticky footers are for screens with exactly one decision. Not for lists.
- Content never sits under the tab bar or home indicator; pad the list bottom by `insets.bottom + tabBarHeight + 16`.

## 5. Navigation model

Decide from the structure, not from taste. Full detail in `navigation.md`.

- **2-5 top-level destinations, flat, equally important** -> bottom tabs.
- **One primary flow with depth** -> stack.
- **A step-by-step process the user should not wander out of** -> modal stack with explicit Cancel.
- **A sub-choice within one screen** -> segmented control or chips, not a new screen.
- **A short focused sub-task** -> bottom sheet.
- **A blocking decision** -> alert dialog. Rare.
- **> 5 destinations** -> tabs + a "More" screen, or restructure. Never 6 tabs.

Back must always be predictable: it undoes the last navigation, never submits, never silently discards typed input (confirm first).

## 6. Interaction model

For each element decide the gesture and its discoverability:

| Intent | Interaction | Discoverability |
| --- | --- | --- |
| Open detail | Tap row | Chevron or obvious tappability |
| Quick action on a row | Swipe (with an accessible fallback) | Never the only path - also in the detail screen |
| Multi-select | Long-press to enter selection mode | Standard; add a "Select" header action |
| Reveal more | Expand in place | Chevron rotates |
| Choose one of many | Sheet or picker | Field shows current value + chevron |
| Refresh | Pull-to-refresh | Standard, plus auto-refresh on focus |
| Destructive | Explicit button + confirm | Never a bare swipe with no undo |

Hidden gestures must never be the only way to do something.

## 7. State design

Every data-backed region needs a decided behaviour. Do not design only the success case.

| State | Decision to make |
| --- | --- |
| Initial load | Skeleton matching the final layout, or spinner if <300 ms expected |
| Refresh | Keep old content visible, show subtle indicator - never blank the screen |
| Empty (never had data) | Explain + offer the creating action |
| Empty (filtered) | "No results for X" + clear filters |
| Partial | Render what loaded; error only the failed region |
| Error | Cause-specific message + retry; keep the rest usable |
| Offline | Cached content + a stale/offline indicator; disable actions that need network with a reason |
| Slow (>3 s) | Reassure ("Still working...") rather than hang |
| Success | Confirm in place (toast/inline) or on a confirmation screen if the outcome matters |
| Stale | Show last-updated time when accuracy matters (balances, prices) |

Regions fail independently. A failed rewards widget must not blank the balance.

## 8. Flows

For multi-screen work, map before building:

1. **Entry points** - all of them, including deep links and push notifications.
2. **Steps** - one decision per step. Combine steps only if they are trivially related.
3. **Progress** - show it when >2 steps ("Step 2 of 4" or a bar).
4. **Exit** - Cancel is always available and always confirms if data would be lost.
5. **Failure at each step** - can the user retry in place, or must they restart? Retry in place unless security forbids it.
6. **Resume** - if the app is killed mid-flow, where does the user land? Never a dead end.
7. **Completion** - what confirms it, and where does the user go next?

Rules: never lose entered data on back; never require re-entering something you already have; validate as early as the data allows (do not fail at step 4 for something knowable at step 1).

## 9. Content hierarchy

Within a component, decide what leads:

- **List row:** identity first (name/merchant/title), then the differentiator (amount/status), then metadata (time/category). Never lead with an ID.
- **Detail screen:** the outcome first (amount, status), then the parties, then the mechanics (reference, method, fee), then actions.
- **Card:** one headline fact, at most two supporting lines, at most one action.

Truncate the least important thing, never the identifying one. Two-line clamps beat aggressive ellipsis on names.

## 10. Handoff to Phase 3

You are ready for visual design when you can answer, without hedging:
- What is rank 1 and how will the user's eye land on it first?
- What is the single primary action and where is it?
- What does this screen look like with zero items, one item, and a hundred?
- What happens on failure, per region?
- Which navigation gesture leaves this screen, and where does it go?
