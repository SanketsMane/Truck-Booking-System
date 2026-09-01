# Success States

Confirmation is part of the transaction. Under-confirming a payment causes support tickets; over-celebrating a small action feels childish.

## 1. Match the confirmation to the stakes

| Stakes | Confirmation |
| --- | --- |
| Trivial, visible (toggle, favourite, reorder) | The UI change itself. No message. |
| Small, invisible (saved a setting, copied text) | Toast, or an inline icon change for 1.5 s + light haptic |
| Medium (profile updated, card added, beneficiary added) | Toast + the updated list/state visible behind it |
| High (payment sent, withdrawal requested, KYC submitted) | **Dedicated success screen** with the details and a receipt path |
| Milestone (first payment, goal reached, cashback unlocked) | Success screen with restrained celebration, once |

Rule: if the user would ever need to prove it happened, it needs a screen with a reference, not a toast.

## 2. Success screen anatomy (money)

```
[centred block]
[success mark - 56-72, animated check, status.success; restrained]
[16]
Title            title/headline - "Money sent" (past tense, definite)
[8]
Amount           amountL, tabular - ₹2,500.00
[4]
To/From          bodySmall text.secondary - "to Ravi Kumar · HDFC ••4321"
[24]
[details block - surface.default, radius lg, grouped rows]
  Date & time          value
  Transaction ID       value + copy affordance
  Payment method       value
  Fee (if any)         value
[32]
Primary action   "Done" -> resets to the sensible root
Secondary        "Share receipt" / "View details" / "Send again"
```

- **Never leave the user stranded.** There is always an obvious next step.
- Back and hardware back must not return to the payment form. `navigation.reset` to the root or the transaction list.
- The transaction must already be visible in history when the user navigates there - no "processing" gap in the list.

## 3. Pending is not success

If the operation is asynchronous (bank transfers, withdrawals, KYC review), the screen says so honestly:
- Title: "Payment initiated" / "Withdrawal requested", not "Payment successful".
- Show the expected completion: "Usually completes within 30 minutes" or a date range.
- State how the user will be told (push notification, email).
- Offer "Track status" leading to the transaction detail.
- The status chip is `status.warning`/`money.pending`, not green.

Never show a green check for something that has not completed. This is the single most trust-damaging pattern in fintech UI.

## 4. Motion and celebration

- Success mark: scale/draw-in over 300-400 ms, once, then settle. A drawn check-stroke reads as premium; a bouncing emoji does not.
- Confetti/particles: only for genuine milestones (first transaction, referral reward, goal completed), maximum ~1.5 s, never on routine payments, and never on anything that could still fail.
- One celebration per event. Do not combine a confetti burst, a modal and a toast.
- Success haptic (`notificationAsync(Success)`) once, at the moment the mark appears.
- Reduce motion: fade the mark in, no particles.

## 5. Receipts and sharing

- Every money movement produces a shareable artefact: a screenshot-friendly detail view at minimum, ideally a generated PDF/image with the merchant, amount, reference, date, and status.
- "Share" uses the native share sheet.
- "Download" saves to Files/Downloads with a clear filename; confirm where it went.
- Receipts must include the status at generation time and be regenerable from the transaction detail later.

## 6. Micro-confirmations

- **Copy:** icon swaps to a check for ~1.5 s + selection haptic; optionally a small "Copied" toast.
- **Save/toggle:** the control's own state is the confirmation; add a toast only if the effect is off-screen.
- **Form step complete:** advance immediately; the progress indicator is the confirmation.
- **Upload:** thumbnail appears with a check overlay.
- **Refresh:** the indicator retracting is enough; no "Updated" toast.

## 7. What comes next

The success screen's job is done when the user has a next step:
- Repeat the action ("Send again", "Add money").
- Go to the object ("View transaction").
- Go home ("Done").
- Adopt a related feature, at most one, and never disguised as a required step.

Do not use the success screen as an advertising slot. One contextual, dismissible suggestion is the limit.

## 8. Accessibility

- Announce the outcome immediately: "Payment successful, ₹2,500 sent to Ravi Kumar".
- Move focus to the success title.
- The success mark is decorative; the text carries the meaning.
- Never encode success in a green colour alone - the check icon and the word "sent"/"completed" carry it.
- Ensure the reference number is readable character-by-character by the screen reader (consider spacing it in the accessibility label).

## 9. Checklist

- [ ] Confirmation strength matches the stakes
- [ ] Pending is labelled pending, not success
- [ ] Amount, counterparty, time and reference are all present for money movements
- [ ] Back cannot return to the form; stack is reset
- [ ] There is exactly one obvious next action
- [ ] Reference is copyable; receipt is shareable
- [ ] Celebration is restrained, single, and reduce-motion aware
- [ ] Outcome announced to screen readers
