# Example — Transaction detail / receipt screen

A trust screen. Its only job is to remove every doubt about what happened to the money.

---

## Phase 1 — Understand

**Requirement:** "A screen showing the details of a transaction."

| Question | Answer |
| --- | --- |
| One job | Answer "what happened to this money?" completely |
| User | Two very different people: someone idly checking a payment arrived, and someone anxious because it did not |
| Most important information | **Amount and status.** Together, not separately. |
| Primary action | Depends on status — see below |
| Secondary actions | Share receipt, copy reference ID, report a problem, repeat payment |
| Arrives from | A transaction row, a push notification, a deep link from an email |
| Edge cases | Pending; failed; refunded; partially refunded; reversed; on hold; a transaction from 3 years ago; a merchant with no logo; a transaction with no note |

**Key insight:** the primary action changes with status. A completed payment's primary action is "Done" or "Send again". A failed payment's primary action is "Try again". An on-hold payment's is "Contact support". Designing one fixed CTA for all statuses is the mistake.

## Phase 2 — UX architecture

```
1  Status + amount          the answer, above the fold, together
2  Who and when             recipient, date, time
3  Money detail             amount, fee, total debited, source
4  Reference and metadata   UTR/reference ID, method, note, category
5  Actions                  status-dependent primary + share/report
```

Navigation: pushed screen, standard back. Deep-link entry must synthesise a sensible back stack (back goes to Activity, not out of the app).

States:

| Status | Header treatment | Primary action | Must also say |
| --- | --- | --- | --- |
| Completed | `status.success` check, "Completed" | Send again / Done | Nothing more |
| Processing | neutral, spinner or clock | Done (non-blocking) | "Usually completes within X" |
| Pending | `status.warning` clock, "Pending" | Done | Expected settlement date |
| Failed | `status.error` alert, "Failed" | Try again | **"No money was deducted"** or "₹500 was debited and will be refunded by 14 Mar" |
| Declined | `status.error`, "Declined by your bank" | Try another method | The reason, in plain words |
| Refunded | `status.info` return arrow | Done | When it lands, and where |
| Reversed | `status.info` | Done | Why, and the expected date |
| On hold | `status.warning` | Contact support | Why, and how long |

## Phase 3 — Visual design

| Element | Decision |
| --- | --- |
| Status block | Full-bleed top section on `bg.canvas`. Status icon (40) in a `status.*.surface` circle, status word in `title` 22, then the amount in `amountXL` 36/42 tabular. Not a card — this is the screen's identity, not an object on it. |
| Amount sign | Explicit `−` / `+` before the currency symbol, plus the status word. Colour is the third signal, never the first. |
| Recipient | Avatar 48 + name in `title` 22 + masked identifier in `bodySmall` `text.secondary` (`•••• 4821`) |
| Detail rows | Label left (`body`, `text.secondary`), value right (`body`, `text.primary`, tabular for amounts). One container, hairline dividers, 16 horizontal / 14 vertical padding. |
| Total emphasis | The "Total debited" row gets `text.primary` weight 600 and a stronger divider above it — it is the number that matters. |
| Reference ID | Monospace or tabular, with a tap-to-copy icon and a toast confirmation. Must be selectable. |
| Actions | Primary full-width button at the bottom, above the safe inset. Share and Report as text buttons or a nav-bar menu. |
| Spacing | Status section 32/24. Detail groups separated by 24. Gutter 16. |
| Decoration | **None.** No gradient, no illustration, no confetti. This screen is read, not admired. |

**Rejected:**
- A celebratory animation on a completed payment — this screen is often opened days later; celebrating then is absurd.
- Hiding the fee behind a "details" toggle — fees must be visible.
- A card per detail group — three cards where three labelled sections would do.
- Colour-only status — fails greyscale and fails colour-blind users.

## Phase 4 — Platform adaptation

| | Android | iOS |
| --- | --- | --- |
| Header | Small app bar, share in the bar, "Report a problem" in `⋮` | Inline title, share icon in the nav bar, actions in a menu |
| Share | Android share sheet (`Share.share`) | iOS share sheet |
| Copy feedback | Snackbar above the CTA | Toast + light haptic |
| Back | Hardware/gesture back; deep-link entry gets a synthesised stack | Swipe-back enabled |
| Screenshot | Allowed here (users share receipts) — unlike PIN screens | Allowed |

## Phase 5 — Implementation notes

- One `TransactionDetail` component driven by a `status` union type — an exhaustive `switch` on status so a new status from the API cannot silently render as blank. Make the default case throw in dev.
- Status → { icon, colour token, label, primary action } lives in one map, shared with `TransactionRow`, so the row and the detail can never disagree.
- Reference ID copy uses `expo-clipboard` (or the project's existing clipboard) + toast + light haptic.
- Amounts formatted through the shared `formatCurrency()`; fee and total computed server-side and displayed, never recomputed on the client.
- Timestamp rendered in the user's local timezone with an explicit date **and** time.

## Phase 6 — Visual QA findings

| Found | Fix |
| --- | --- |
| Failed status did not say whether money left the account | Added an explicit debit/refund line — the single most important fix on this screen |
| Reference ID was not selectable and had no copy affordance | Added tap-to-copy + toast |
| Long merchant names pushed the amount off-screen | Name wraps to 2 lines; amount pinned right |
| Status colour only; no icon in the row's compact variant | Icon + word added everywhere |
| Deep-link entry had an empty back stack and exited the app | Synthesised Activity → Detail stack |
| Dark mode: `status.error` deep red was unreadable | Switched to the dark-tuned error token |

## Rules for any receipt screen

1. Status and amount together, above the fold.
2. Every failure states whether money moved.
3. Fee and total always visible.
4. Reference ID copyable.
5. Status = icon + word + colour, in that order of importance.
6. The primary action depends on the status.
7. No decoration. Trust comes from clarity.
8. Deep links land with a sensible back stack.
