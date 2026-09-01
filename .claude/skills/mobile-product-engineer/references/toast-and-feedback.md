# Toasts, Snackbars & Inline Feedback

The lightest way to confirm, warn and recover. Getting this right removes most of the need for dialogs.

## 1. Choosing the feedback channel

| Feedback | Channel |
| --- | --- |
| Action succeeded, no follow-up needed | Inline change only (the UI already reflects it) or a toast |
| Action succeeded and is undoable | Snackbar with "Undo", 4-6 s |
| Action failed but is retryable | Inline error near the element + retry, or a snackbar with "Retry" |
| A condition affecting the whole screen (offline, unverified account, maintenance) | Persistent banner at the top of the content |
| A field is invalid | Inline text under the field |
| A blocking decision is required | Dialog |
| Background progress (upload, sync) | Persistent inline progress, not a toast |

Rule: **if the UI visibly changed, you often need no message at all.** A toast that says "Item added" when the item is now visibly in the list is noise.

## 2. Toast / snackbar spec

```
Position    bottom, above tab bar + insets.bottom + 16 (or top on Android if it competes with a sticky CTA)
Width       full width minus gutters, max 640 centred on wide screens
Surface     surface.inverse (dark on light theme) or surface.raised with elevation 3
Type        bodySmall (14/20) - one line preferred, two maximum
Action      at most one, text button, brand or inverse colour, min 48 hit area
Duration    short 2 s (confirmation) | default 3-4 s | with action 5-6 s | never permanent
Motion      slide up + fade, base in / fast out
Queue       one at a time; new important messages replace, others queue (max 3, drop the rest)
Dismiss     swipe to dismiss; auto-dismiss on timer; never require a tap
```

- Never block the primary CTA. If the CTA is at the bottom, raise the toast above it or place it at the top.
- Toasts never carry critical information the user must act on - they disappear.
- Pause the timer while a screen reader is focused on the toast; extend duration when accessibility services are on.

## 3. Undo pattern

Preferred over confirmation dialogs for reversible destructive actions:

1. Perform the action immediately and optimistically (remove the row with a layout animation).
2. Show a snackbar: "Transaction hidden" + "Undo", 5 s.
3. Commit to the server after the window closes, or immediately with a compensating call on undo.
4. If the commit fails, restore the item and show a retry message.

Do not offer undo for anything you cannot actually undo.

## 4. Banners

Persistent, contextual, non-modal:

```
Placement   top of the affected content region (below the header), full width or gutter-inset
Anatomy     status icon (20) + message (bodySmall) + optional action + optional dismiss
Colour      status.*.surface background, status.*.text text, optional status.*.border left edge
Behaviour   stays until resolved or dismissed; reappears if the condition returns
```

Use for: offline, degraded service, unverified email/KYC, expiring card, pending action required.
Do not use for: transient success, marketing (use a dismissible card in the content), or anything with more than one action.

Never stack more than one banner. Prioritise: blocking > security > account state > informational.

## 5. Inline feedback

The best feedback is where the action happened:
- A field shows its own error under it.
- A saved toggle shows its new state instantly (optimistic) and reverts with a message on failure.
- A failed list row shows a retry affordance in the row.
- A copy action turns the icon into a check for 1.5 s (plus a haptic) instead of firing a toast.
- A "load more" failure becomes a footer retry row.

## 6. Haptics pairing

See `haptics.md`. Summary: success -> notification success; error -> notification error; undo/dismiss -> nothing; light selection changes -> selection tick. Never fire haptics for passive/system-initiated messages.

## 7. Copy rules

- State the outcome, not the mechanism: "Money sent" not "API call succeeded".
- Past tense for completed actions, present for ongoing: "Sending...", "Money sent".
- No exclamation marks in error messages, at most one elsewhere.
- Include the object when there might be ambiguity: "Beneficiary removed" beats "Removed".
- Errors: what happened + what to do. "Couldn't send money. Check your connection and try again."
- See `microcopy.md`.

## 8. Implementation notes

- One global host mounted above navigation (e.g. inside the root with `react-native-toast-message`, `notifee` for in-app, or a custom Reanimated + context host).
- Never use Android's native `ToastAndroid` for anything cross-platform - it is unstyled and unavailable on iOS.
- Respect safe areas and the keyboard: if the keyboard is open, place the toast above it.
- The host must render above bottom sheets and modals, or the message will be invisible when it matters most.
- Toasts must be announced: `accessibilityLiveRegion="polite"` on Android, `AccessibilityInfo.announceForAccessibility` on iOS.

## 9. Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Toast for every interaction | Only when the result is not visible |
| Critical error in a 2 s toast | Persistent inline error or banner |
| Toast covering the CTA the user must now press | Reposition or delay |
| Multiple toasts stacking | Queue with a cap |
| "Something went wrong" | Say what and what to do |
| Success toast plus a success dialog plus a confetti animation | Pick one |
| Toast that requires reading in under 2 s | Extend the duration or use a banner |
