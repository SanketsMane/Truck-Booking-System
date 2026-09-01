# Example — Send money (multi-screen flow)

A flow, not a screen. The design work is in the **transitions between steps** and the state at each one.

---

## Phase 1 — Understand

| Question | Answer |
| --- | --- |
| One job | Move a specific amount to a specific person, with certainty |
| User | Often in a hurry, sometimes anxious, occasionally being socially pressured (a fraud vector) |
| Most important information | Changes per step: *who* → *how much* → *what exactly will happen* |
| Primary action | One per step, always forward |
| Edge cases | Insufficient balance; exceeds a limit; recipient not found; first-time recipient; network drop mid-payment; duplicate submission; app killed mid-flow; OTP expiry |

**Non-negotiable:** the user must never be uncertain whether money left their account. Every terminal state answers it.

## Phase 2 — UX architecture

```
Recipient  →  Amount  →  Review  →  Authorise  →  Processing  →  Result
```

| Step | Contains | Primary action |
| --- | --- | --- |
| Recipient | Search, recents, contacts, "new recipient" | Continue (enabled once one is selected) |
| Amount | Amount entry, available balance, optional note | Continue (enabled once valid) |
| Review | Every fact about the transfer | Confirm and send |
| Authorise | PIN / biometric | (implicit) |
| Processing | Honest progress | none — blocked |
| Result | Outcome, receipt, next action | Done / Try again |

Navigation model: a **full-screen modal stack**, not sheets. This is a self-contained task with its own lifecycle. Exiting requires an explicit Cancel with a discard confirmation once an amount has been entered.

Back behaviour per step:

| Step | Back |
| --- | --- |
| Recipient | Cancels the flow (no data yet, no confirmation needed) |
| Amount | Returns to Recipient, keeping the selection |
| Review | Returns to Amount, keeping everything |
| Authorise | Returns to Review |
| Processing | **Disabled.** Warn if attempted. |
| Result | Goes **home**, never back into the flow |

State preserved across steps in a flow-level store, so back never loses input. If the app is killed mid-flow, do not restore a half-built payment — start clean.

## Phase 3 — Visual design per step

**Recipient**
- Search field at the top, auto-focused (this screen exists for that input).
- "Recents" as a horizontal avatar row (56 avatars + name beneath) — genuinely useful, and the one place a horizontal scroller earns its place.
- Full contact list below, alphabetical, sticky headers.
- Rows 64: avatar 40 · name `body` · masked identifier `caption` `text.secondary`.
- Empty search: "No one matches 'xyz'" + [Add a new recipient].

**Amount**
- The amount **is** the screen. `amountXL` at 44–56, tabular, centred, with the currency symbol as a static adornment.
- Available balance directly beneath in `bodySmall` `text.secondary`: "₹12,480.50 available".
- Custom numeric keypad at the bottom — this keeps the CTA permanently visible and removes keyboard-avoidance entirely.
- Optional note field, single line, above the keypad.
- Live validation: exceeding the balance turns the amount `status.error` and shows "You need ₹250 more" — inline, no dialog.
- CTA pinned above the keypad, disabled until valid.

**Review** — the trust step. Full screen, no card wrapper, a labelled list:
```
To            Priya Sharma
              HDFC •••• 4821
Amount        ₹5,000.00
Fee           ₹0.00
─────────────────────────
Total debited ₹5,000.00      ← emphasised
From          Savings •••• 1204
Arrives       Within 2 hours
```
- Each line editable by tapping back to its step.
- A first-time-recipient warning banner if applicable: "You've never sent money to this account. Check the name carefully."
- CTA: **"Confirm and send ₹5,000"** — the amount in the button label, so a mis-tap is impossible.

**Authorise**
- Biometric prompt, or the PIN keypad screen. Prompt copy names the action and amount.
- Fallback to PIN always available. -> `security-ux.md`

**Processing**
- Centred, calm, honest. "Sending ₹5,000 to Priya…" with an indeterminate indicator.
- No fake progress bar. No cancel. Back disabled with a warning.
- If it exceeds ~10 seconds: "This is taking longer than usual. Don't close the app."

**Result**
- Full screen. Status icon 64 in a `status.*.surface` circle, outcome in `title`, amount in `amountXL`.
- Success: "₹5,000 sent to Priya" + "Arrives within 2 hours" + reference ID (copyable).
- Failure: the reason, and **explicitly** whether money was debited.
- Actions: [Done] primary → home. [Share receipt] / [Try again] secondary.
- Success check draws over ~350 ms with a success haptic. **No confetti** on a routine transfer.

## Phase 4 — Platform adaptation

| | Android | iOS |
| --- | --- | --- |
| Presentation | Full-screen activity-style stack | Full-screen modal (`presentation: 'fullScreenModal'`), swipe-dismiss **disabled** |
| Step transition | Shared-axis / slide forward-left | Slide forward-left |
| Cancel | X top-left + hardware back, both confirming discard | "Cancel" top-left |
| Authorise | BiometricPrompt | Face ID / Touch ID prompt |
| Processing back | `BackHandler` returns true + warning snackbar | Gesture disabled |
| Result haptic | Notification success/error | Notification success/error |
| Keypad | Custom, both platforms — consistency matters more than platform idiom here |

## Phase 5 — Implementation notes

- **Idempotency key** generated when the user reaches Review, sent with the request. A retry after a network timeout must never create a second payment. This is the single most important engineering detail in the flow.
- CTA disabled and a submission flag set the moment Confirm is tapped — double-tap must be impossible.
- Amount held as integer minor units throughout; formatted only for display.
- Limits and fees fetched at the Amount step so Review has no surprises; if a fee appears only at Review, that is a product failure.
- Network timeout ≠ failure. On timeout, poll the transaction status before showing any outcome — never tell a user a payment failed when it may have succeeded.
- Flow state in a dedicated store, cleared on completion or cancellation.
- Analytics per step, so drop-off is measurable — without logging amounts or identifiers.

## Phase 6 — Visual QA findings

| Found | Fix |
| --- | --- |
| Double-tap on Confirm sent two payments | Disabled-on-submit + idempotency key |
| Network timeout showed "Failed" while the payment had succeeded | Status polling before rendering an outcome |
| Back from Result returned to Processing | Result resets the stack to home |
| Fee first appeared on Review | Fee fetched and shown on the Amount step |
| The amount was hidden behind the keyboard on small screens | Custom keypad; system keyboard removed from the flow |
| Discard confirmation missing — back lost a typed amount | Confirmation added from the Amount step onward |
| First-time recipient had no warning | Banner added on Review |
| Success used a bouncy spring | Replaced with a decelerating draw |

## Rules for any money-movement flow

1. One decision per step.
2. Back preserves state, always.
3. A review step before anything irreversible, showing the **total**.
4. The CTA on Review names the amount.
5. Authorisation is a deliberate act.
6. Double-submission impossible: disabled CTA **and** an idempotency key.
7. Timeout is not failure — poll before reporting.
8. Every terminal state says whether money moved.
9. Result goes home, not back into the flow.
10. No decoration anywhere in the flow.
