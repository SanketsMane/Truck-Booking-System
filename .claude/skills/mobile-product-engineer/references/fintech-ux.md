# Fintech UX

Money apps are judged on **trust** before beauty. Clarity, accuracy and honesty outrank visual flair everywhere in this file.

## 1. Governing principles

1. **Never leave the user unsure whether money moved.** Every terminal state answers it explicitly.
2. **Never truncate, abbreviate or animate away an amount.** `₹1,2…` is a defect.
3. **State beats decoration.** A boring, unambiguous transaction row beats a beautiful ambiguous one.
4. **Pending is a first-class state**, not an edge case.
5. **Show the total the user will actually pay**, including fees, before they commit.
6. **Reversible where possible, confirmed where not.**
7. No gradients-on-gradients, glassmorphism or playful bounce on money screens. Flashy reads as untrustworthy.

## 2. Formatting money

```
₹12,480.50      currency symbol, locale grouping, 2 decimals, tabular figures
+ ₹1,250.00     credit — sign first, colour + sign + label
− ₹500.00       debit
₹0.00           never blank, never "-", never "N/A"
```

Rules:

- **Tabular figures always** (`fontVariant: ['tabular-nums']`). Proportional digits make columns of amounts jitter and look amateur.
- Locale-correct grouping — Indian lakh/crore grouping (`12,34,567.89`) differs from Western (`1,234,567.89`). Use `Intl.NumberFormat` with the actual locale, never a hand-rolled regex.
- Always show the currency on the first amount of a screen and in every confirmation.
- Decimals: always 2 for fiat. Never round a balance down for display.
- **Never use floats for money.** Integer minor units (paise/cents) or a decimal library. Format only at the render boundary.
- Right-align amounts in lists so the decimal points line up.
- Large amounts scale the type down rather than truncate. -> `typography.md`
- Abbreviations (₹1.2L, $1.2M) are acceptable **only** in charts and dense analytics — never on a balance, a row amount or a confirmation.

## 3. Balances

Distinguish clearly and always:

| Balance | Meaning | Treatment |
| --- | --- | --- |
| **Available** | Spendable right now | The hero number. Largest type on the screen. |
| **Pending** | Incoming or outgoing, not settled | Secondary line, with count and expected date |
| **Total / Ledger** | Available + pending | Only if the product needs it; label it unambiguously |
| **On hold / Blocked** | Reserved, not spendable | Explicit label + a "why" affordance |

- Never show a single unlabelled number and call it "Balance" when a pending amount exists.
- Show "Last updated HH:MM" or a refresh affordance when the balance can be stale.
- Loading a balance: skeleton the number, never show ₹0.00 as a placeholder. Showing a false zero is alarming. -> `loading-states.md`
- Failed to load: show the last known value with a stale marker and a retry, or an explicit error — never a silent zero.
- Balance privacy: offer a mask toggle (`••••••`), remember the preference, and mask by default in app-switcher snapshots. -> `security-ux.md`

## 4. Transaction rows

Every row answers: **who, what, how much, when, what state.**

```
[icon/avatar]  Merchant or person name              − ₹1,250.00
               Card ·· 4821 · 12 Mar, 4:32 pm       Completed
```

- Height 72 for a two-line transaction row; 56 for a compact one.
- Name is `text.primary` at body weight; metadata `text.secondary` at 13–14.
- Amount right-aligned, tabular, sign-prefixed, colour-coded **and** signed.
- Status: only shown when it is not "completed", or shown always if the product has frequent pendings. Colour + icon + word — never colour alone.
- Group by date with sticky section headers ("Today", "Yesterday", "12 March").
- Tapping the row opens the full detail. The row itself is not the receipt. -> `lists-and-data.md`

## 5. Transaction status

Model these explicitly; do not collapse them:

| Status | Meaning | Visual | User needs to know |
| --- | --- | --- | --- |
| Processing | Submitted, in flight | neutral/info + spinner or clock | Do not retry yet |
| Pending | Awaiting settlement | warning tint + clock | Expected completion time |
| Completed | Settled | success + check | Nothing further |
| Failed | Did not go through | error + alert | **Was I charged?** + what to do |
| Declined | Rejected by bank/network | error + alert | The reason + an alternative |
| Reversed / Refunded | Money came back | info + return arrow | When it lands |
| Cancelled | Stopped before completion | neutral | Who cancelled it |
| On hold | Under review | warning | Why, and how long |

**Every failure state must say whether money left the account.** "Payment failed. No money was deducted." or "₹500 was debited and will be refunded by 14 March."

## 6. Transfer / send-money flow

```
1 Recipient   → who (search, recents, new)
2 Amount      → how much (+ purpose/note)
3 Review      → exact amounts, fees, total, source, destination, ETA
4 Authorise   → PIN / biometric
5 Processing  → honest, non-blocking-looking
6 Result      → unambiguous outcome + receipt + next action
```

Rules:

- **Amount screen**: the amount is the hero. Big numeric display, custom keypad (keeps the CTA visible), available balance shown, live validation against limits. -> `keyboard-and-input.md`
- **Review screen is mandatory** for anything irreversible. Show: recipient (name **and** masked account/UPI id), amount, fee, taxes, **total debited**, source account, and expected arrival. Never hide the fee until after commit.
- Editing from review returns to the exact step, preserving all input.
- **Authorise** is a deliberate act: PIN, biometric or OTP. Never a single tap with no verification on a first-time or high-value transfer.
- **Processing**: disable the CTA, show honest progress, prevent double-submission (idempotency key on the request), and warn against backing out. Never fake a progress bar.
- **Result**: full-screen, unambiguous, with amount, recipient, reference ID, timestamp, and actions (Share receipt, Done, Send again).
- Back from the result goes **home**, never back into the flow.

## 7. Add money / withdraw

- Show the fee **and** arrival time per method, before selection, in the method list.
- Minimum and maximum limits shown up front, not discovered on error.
- Withdraw: show available-to-withdraw, which may be less than the balance — and explain why.
- Bank account selection shows bank name, masked number, and the account nickname.
- Instant vs standard: state the cost and the speed of each plainly.

## 8. Confirmation screens

Before an irreversible action, the user must see:

- [ ] Exactly what is happening, in one sentence
- [ ] The precise amount, and the **total** including fees
- [ ] Where it comes from and where it goes
- [ ] When it arrives
- [ ] Whether it can be cancelled or reversed
- [ ] A clear way back that loses nothing

Do not put a review screen behind a bottom sheet for a large transfer — it deserves a full screen.

## 9. Receipts

After every completed transaction, provide: amount, status, date and **time**, recipient details, source, fees, reference/UTR ID (with copy-to-clipboard), and a share/download action. Reference IDs must be selectable and copyable — support calls depend on them.

## 10. Cashback and rewards

- Distinguish **earned** (yours), **pending** (conditional), and **expired**.
- Always state the qualifying condition and expiry date next to the amount.
- Never present projected/potential rewards in the same visual weight as real money.
- Cashback that is not yet redeemable must not be added to the spendable balance.
- Progress toward a reward: determinate progress with real numbers ("₹350 of ₹500 spent").
- Do not gamify a payment failure. Celebration belongs on genuine milestones only. -> `success-states.md`

## 11. KYC and verification

- Explain **why** before asking: "We need this to comply with regulations and keep your account secure."
- Show total steps and current position ("Step 2 of 4").
- Save progress — never make a user restart after a dropped connection.
- Document capture: live guidance (edges, glare, focus), instant client-side quality checks, retake before submit.
- States: not started / in progress / under review (with expected time) / approved / rejected (with the specific reason and a path to fix).
- Never block the entire app for KYC if partial functionality is legally permitted — show what is available and what unlocks after verification.
- Handle rejection with a specific, actionable reason. "Rejected" alone is unacceptable.

## 12. Beneficiaries and bank accounts

- Verify and display the resolved account-holder name **before** allowing a first transfer. This is the single strongest defence against misdirected payments.
- Show masked account numbers (`•••• 4821`) with bank name and logo.
- Cooling-off periods or limits for newly added beneficiaries: explain them at add time.
- Deleting a beneficiary: confirm, and state that history is retained.
- Duplicate detection when adding.

## 13. OTP

- 6 digits typical; auto-read where the platform allows. -> `keyboard-and-input.md`
- Show where it was sent, masked: "Sent to •••••• 4821".
- Resend timer, visible and honest; enable resend when it expires.
- Wrong code: keep the digits, show the error inline, state attempts remaining.
- Expiry: state the validity period; on expiry offer resend, do not silently fail.
- Never make the user leave the screen to read the SMS and lose their input.

-> `security-ux.md`

## 14. History, search, filters, statements

- Default view: reverse chronological, grouped by date.
- Search across merchant, person, amount, reference ID and note.
- Filters: date range, type (sent/received), status, account, category. Show active filters as removable chips with a "Clear all".
- Empty filtered result says which filters caused it and offers to clear them. -> `empty-states.md`
- Infinite scroll with a date-jump affordance for older history; a pure infinite list is unusable at 3 years of data.
- Statements: month/range selection, format choice, and delivery (download/email) with a clear success confirmation.
- Running balance per row only if the product's users expect it; it is expensive to compute correctly and misleading if wrong.

## 15. Trust and security signals

Earn trust with substance, not badges:

- Masked account numbers everywhere.
- The resolved recipient name before every first-time transfer.
- Clear, immediate confirmations with reference IDs.
- Honest, specific error messages.
- Visible fees, before commitment.
- Session timeouts on inactivity for sensitive areas.
- A "Report a problem" path from every transaction detail.

Avoid: unexplained trust seals, marketing superlatives on a payment screen, countdown timers manufacturing urgency, pre-ticked opt-ins, and any dark pattern. -> `security-ux.md`

## 16. Fraud and warnings

- Warn at the point of risk, not in a policy page: first-time recipient, unusually large amount, a recipient flagged by your systems.
- Warning copy is specific: "You've never sent money to this account before. Double-check the name."
- Make the safe option the easy one, but never block a legitimate user with no override path.
- Never use fear as decoration — a warning that appears every time gets ignored.

## 17. Fintech checklist

- [ ] Every amount: tabular, locale-correct, 2 decimals, currency shown, never truncated
- [ ] Available vs pending balance distinguished and labelled
- [ ] Balance loading uses a skeleton, never a false ₹0.00
- [ ] Every transaction row: who, what, how much, when, status
- [ ] Every failure states whether money moved
- [ ] Review screen before every irreversible action, with total including fees
- [ ] Double-submission impossible (disabled CTA + idempotency key)
- [ ] Result screen unambiguous, with a copyable reference ID
- [ ] Back from result goes home, not into the flow
- [ ] Status conveyed by icon + word + colour, never colour alone
- [ ] Masked account numbers; recipient name verified before first transfer
- [ ] Fees and arrival times shown before commitment
- [ ] Rewards separated into earned / pending / expired with conditions
- [ ] KYC progress saved, rejection reasons specific
- [ ] No flashy motion or decoration on money screens
