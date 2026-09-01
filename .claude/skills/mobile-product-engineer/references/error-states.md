# Error States

Errors are where trust is won or lost - especially with money.

## 1. Taxonomy and treatment

| Type | Cause | Treatment |
| --- | --- | --- |
| **Connectivity** | No network, timeout | Inline/region error + Retry; persistent offline banner; keep cached content |
| **Server** (5xx) | Backend failure | Region error + Retry + reference/support path if repeated |
| **Client** (4xx) | Bad request, expired token | Usually invisible - refresh the token, or route to login with an explanation |
| **Validation** | User input | Inline under the field, never a dialog |
| **Business rule** | Limit exceeded, insufficient balance, not eligible | Specific message + the exact remedy, ideally *before* submission |
| **Permission** | Denied camera/notifications/contacts | Explain the consequence + deep link to settings |
| **Not found** | Deleted/invalid item | Friendly screen + a way back to the list |
| **Rate limit** | Too many attempts | Countdown + when to retry + alternative channel |
| **Unknown** | Unhandled | Generic message + Retry + a reference code |

## 2. Placement

- **Field-level:** under the field. `caption` in `status.error.text`, plus a border change and an icon.
- **Region-level:** in the region that failed, keeping the rest of the screen alive.
- **Screen-level:** only when nothing on the screen can work. Header and back stay usable.
- **Transient/actionable:** snackbar with Retry.
- **Persistent condition:** banner (offline, degraded service).
- **Dialogs:** only when a decision is genuinely required.

Never a full-screen error for a partial failure. Never a toast for an error the user must act on.

## 3. Anatomy of a screen/region error

```
[icon 32-40 in a 64 status.error.surface circle - restrained, not a giant broken robot]
Title         subtitle/title - what happened, in the user's terms
Description   bodySmall text.secondary - what to do next, one or two lines
[Primary]     Retry / the recovery action
[Secondary]   Go back / Contact support / Use another method
[reference]   caption text.tertiary - error code, only if support will need it
```

## 4. Error copy rules

1. Say what happened, in user terms: "We couldn't load your transactions."
2. Say what to do: "Check your connection and try again."
3. Never expose stack traces, HTTP codes in prose, or backend jargon. A short reference code at the bottom is fine.
4. Never blame the user. "That code has expired" not "You entered a wrong code".
5. No "Oops!", no exclamation marks, no humour on money errors.
6. Be specific about money: "Your bank declined this payment" beats "Transaction failed".
7. If money may have moved, say so explicitly and say what happens next (see §6).
8. If it is temporary, say so: "This usually resolves within a few minutes."

Examples:

| Bad | Good |
| --- | --- |
| "Error 500" | "Something went wrong on our end. Try again in a moment." |
| "Invalid input" | "Enter a 10-digit mobile number." |
| "Transaction failed" | "Payment declined by your bank. Try another card or contact your bank." |
| "Insufficient funds" | "Your balance is ₹420. Add ₹80 to send ₹500." |
| "Network error" | "You're offline. We'll retry when you're back online." |

## 5. Retry behaviour

- Retry must be one tap and must re-run only the failed request.
- Show the loading state in the same position; do not flash back to a skeleton of the whole screen.
- Exponential backoff for automatic retries (1 s, 2 s, 4 s, cap 3 attempts); manual retry always available immediately.
- Never auto-retry a non-idempotent money operation. Check status first.
- After ~3 failures, change the message and offer another path (support, another payment method).

## 6. Money-specific error handling

The critical rule: **an ambiguous payment must never look like a definite failure.**

| State | UI |
| --- | --- |
| Definitely failed (declined, validation) | "Payment failed - no money was deducted." + Retry |
| Definitely succeeded | Success screen with reference |
| **Unknown** (timeout, no response) | "We're confirming this payment. Don't retry yet - we'll update you in a moment." Poll status, show pending, never offer a naive retry |
| Reversal in progress | "Refund of ₹500 is on the way - typically 3-5 working days." with the expected date |

- Always show a transaction reference the user can copy and quote to support.
- Never let a retry create a duplicate payment: idempotency keys server-side, disabled buttons client-side, and a status check before any retry.
- Failed payments must appear in transaction history with a clear "Failed" status - silently vanishing looks like theft.
- More in `fintech-ux.md`.

## 7. Offline

- Detect with `@react-native-community/netinfo`; distinguish "no connection" from "connected but the server is unreachable".
- Show cached content with a persistent, unobtrusive banner: "Offline - showing saved data".
- Disable actions that need the network, with a reason on press rather than a mysteriously dead button.
- Queue safe actions (drafts, reads) and sync on reconnect with a confirmation.
- Never queue money movement silently. If the user cannot pay now, say so.
- On reconnect, refresh automatically and remove the banner.

## 8. Global error handling

- An error boundary around each screen (and the app root) that renders a recoverable error screen, not a white screen. Include "Reload" and "Go home".
- Log to a crash reporter (Sentry/Crashlytics) with breadcrumbs, never logging PII, card numbers, tokens or amounts tied to identities.
- Handle unhandled promise rejections.
- Distinguish expected failures (handled, no crash report) from real bugs (reported).

## 9. Accessibility

- Errors are announced: `accessibilityLiveRegion="polite"` (Android) / `announceForAccessibility` (iOS).
- Focus moves to the first invalid field on submit failure.
- Error text is programmatically linked to its field, not just visually near it.
- Never colour alone: icon + text always.
- Contrast of error text on its surface >= 4.5:1 in both themes.

## 10. Checklist

- [ ] Every network call has a defined failure UI
- [ ] Errors appear in the region that failed
- [ ] Copy says what happened and what to do
- [ ] Retry works and is idempotent-safe
- [ ] Ambiguous payment states are handled as pending, not failed
- [ ] Offline banner + cached content + disabled actions with reasons
- [ ] Error boundary prevents white screens
- [ ] No stack traces or raw codes in prose
- [ ] Announced to screen readers; focus managed
