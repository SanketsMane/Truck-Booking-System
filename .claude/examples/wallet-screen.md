# Example — Wallet / home screen

A worked end-to-end example of the six phases. The point is the **reasoning**, not the code. Adapt the decisions; do not copy the markup.

---

## Phase 1 — Understand

**Requirement:** "Build the wallet home screen."

| Question | Answer |
| --- | --- |
| One job | Tell the user how much money they have, and let them act on it |
| User | Checking their balance in a queue, one-handed, possibly on a poor connection |
| Most important information | **Available balance** — one number |
| Primary action | Send money |
| Secondary actions | Add money, request, scan/pay |
| Arrives from | App launch (this is the root tab) |
| Goes to | Send flow, add-money flow, transaction detail, full history |
| Edge cases | Balance not loaded; balance failed to load; zero balance; new user with no transactions; pending amounts; offline; very large balance |

**Decision:** this is a *glance-first* screen. A user opens it, reads one number, and either leaves or taps one action. Everything else is subordinate.

## Phase 2 — UX architecture

Information hierarchy:

```
1  Available balance                     the reason the screen exists
2  Primary actions (send / add)          what they came to do
3  Pending amount, if any                affects what they can spend
4  Recent transactions (5–6)             "did my payment arrive?"
5  Rewards / offers                      only if the product has them
6  Link to full history                  escape hatch
```

Navigation model: root of a bottom tab bar (Home · Activity · Cards · Profile). No back button. Tapping a transaction pushes a detail screen. Send/Add open full-screen flows (they are self-contained tasks, not sheets).

Interaction model: tap-driven. Pull-to-refresh on the scroll view refreshes balance and recent transactions together. Long-press on a transaction offers "Repeat" and "Share receipt".

State behaviour:

| State | Behaviour |
| --- | --- |
| Loading | Skeleton the balance number and 4 transaction rows. Actions stay enabled — they do not depend on the balance. **Never render ₹0.00 as a placeholder.** |
| Empty (new user) | Balance shows ₹0.00 (real, not a placeholder). Transactions area shows "No transactions yet — your payments will appear here" + [Add money]. |
| Error | Balance area shows the last-known value with a "Couldn't refresh · Retry" line, or an inline error if there is no cached value. The rest of the screen still renders. |
| Offline | Cached balance with a "Last updated 4:32 pm" marker. Send/Add disabled with an explanation, not silently broken. |
| Pending | A secondary line under the balance: "₹2,500 pending · arrives by 14 Mar". |

## Phase 3 — Visual design

Visual hierarchy — the eye should land: balance → primary action → transactions.

| Element | Decision |
| --- | --- |
| Balance | `amountXL` 36/42, tabular figures, `text.primary`. Label "Available balance" above it in `label` 13, `text.secondary`. |
| Balance container | **Not a card.** A full-bleed section on `bg.canvas` with generous vertical padding. A card here would fence off the most important number on the screen for no reason. |
| Primary actions | A row of 3–4 icon+label targets, 72 wide, 24 icon, `label` 13 beneath. `brand.primarySubtle` circular backgrounds, not filled brand buttons — four filled brand buttons would compete with each other and with the balance. |
| Pending | `bodySmall` 14, `money.pending`, with a clock icon. |
| Transactions | Section header "Recent" (`label`, `text.secondary`, uppercase off) + a "See all" text link right-aligned. Rows 72 tall on `surface.default`, separated by `border.subtle` hairlines. **One** card wrapping the whole list, not one card per row. |
| Row anatomy | 40 avatar/icon · name (`body`, primary) over metadata (`caption`, secondary) · amount right-aligned (`amountS`, tabular, signed) with status beneath if not completed |
| Spacing | Gutter 16. Balance section 32 top / 24 bottom. Section gaps 24. Row internal padding 16/12. |
| Elevation | Balance section: flat. Transaction list card: elevation 1 + `border.subtle`. Nothing else raised. |
| Colour | `brand.primary` appears in exactly two places: the action icon tint and the "See all" link. Money uses `money.positive` / `money.negative`. |

**Rejected during design:**
- A gradient balance card — decorative, and it would make the number harder to read.
- A card per transaction row — the classic over-carding failure; rows in one container scan far faster.
- A carousel of offers above the balance — pushes the primary information below the fold.
- Four filled brand buttons — nothing would lead.

## Phase 4 — Platform adaptation

| | Android | iOS |
| --- | --- | --- |
| Header | Small top app bar: avatar left, notification bell right | Large title "Home" that collapses on scroll, or no header at all with the balance as the visual anchor |
| Status bar | Translucent, edge-to-edge, content scrolls beneath | Translucent |
| Press feedback | Bounded ripple on rows and action targets | Opacity 0.9 + scale 0.97 |
| Back | Root tab — back exits after returning to the first tab | No back |
| Refresh | Material `RefreshControl` | iOS `RefreshControl` |
| Bottom inset | Tab bar clears the gesture/3-button inset | Tab bar clears the home indicator |
| Haptic | Light on refresh trigger | Light on refresh trigger |

## Phase 5 — Implementation notes

- `Screen` primitive handles the gutter and safe areas; the balance section opts out of the gutter to go full-bleed, then re-applies its own padding.
- Recent transactions use the **same** `TransactionRow` component as the Activity tab. One component, two screens — this is what stops the app from drifting.
- Balance and transactions are two independent queries so one can fail without blanking the other.
- Currency formatting lives in `formatCurrency()`, unit-tested, called at render only.
- The scroll view is a `FlatList` with `ListHeaderComponent` for the balance + actions, so the rows stay virtualised. Never a `FlatList` inside a `ScrollView`.
- Refresh triggers both queries and resolves when both settle.

## Phase 6 — Visual QA findings (real examples of what this pass catches)

| Found | Fix |
| --- | --- |
| Balance used proportional figures; digits jittered on refresh | `fontVariant: ['tabular-nums']` |
| Skeleton was one grey block; content jumped on arrival | Skeleton reshaped to match the actual balance + label layout |
| At font scale 2.0× the four action labels clipped | Labels wrap to two lines; targets given `minHeight` |
| Last transaction row sat under the tab bar | Added `contentContainerStyle` bottom padding = tab height + inset + 16 |
| Pending line used amber colour only, no icon | Added a clock icon and the word "pending" |
| Offline showed a stale balance with no indication | Added "Last updated 4:32 pm" and disabled Send with an explanation |

## Checklist for this screen type

- [ ] Balance is the largest element and is never a placeholder zero
- [ ] Available vs pending distinguished
- [ ] Exactly one primary action leads
- [ ] Transaction rows shared with the Activity screen
- [ ] Loading skeleton matches the real layout
- [ ] Empty, error and offline states all render the rest of the screen
- [ ] List virtualised via `ListHeaderComponent`
- [ ] Last row clears the tab bar
