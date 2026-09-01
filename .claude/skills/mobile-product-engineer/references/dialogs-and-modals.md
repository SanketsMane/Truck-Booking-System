# Dialogs & Modals

Interruption is expensive. Every dialog must earn its interruption.

## 1. Selection matrix

| Situation | Use |
| --- | --- |
| Blocking decision, 1-2 short options, consequence matters | **Alert dialog** |
| Destructive confirmation | **Alert dialog** (iOS action sheet is also acceptable for the destructive-verb pattern) |
| Choose from 3-8 options | **Bottom sheet** |
| Contextual actions for an item | Bottom sheet / action sheet |
| A task with more than one input | **Full-screen modal** |
| Multi-step flow | Full-screen modal stack |
| Information with no decision | **Toast, banner or inline** - never a dialog |
| Success confirmation | Toast, inline, or a success screen - not a dialog |
| Errors that can be retried in place | Inline error + retry, not a dialog |
| Permission request | Priming screen -> OS prompt (see `notifications.md`, `security-ux.md`) |

## 2. Alert dialogs

**Anatomy:** title (question or statement, `title`/`subtitle`), one or two lines of body, 1-2 actions.

Rules:
- **Title is the decision**: "Delete this beneficiary?" not "Warning".
- **Buttons are verbs**: "Delete" / "Cancel". Never "OK" / "Yes" / "No" for a destructive or ambiguous action - a user reading only the buttons must understand the outcome.
- **Max two actions.** Three means it is a sheet.
- **Destructive action is never the visually default one.** iOS: `destructive` style, Cancel is the bold/default. Android: destructive as a text button on the right, with the safe action to its left.
- Body explains the consequence and whether it is reversible: "This cannot be undone."
- No dialog on app launch. No dialog for marketing. No dialog chains.
- Use the platform's own dialog (`Alert.alert` or a themed component matching platform conventions). A custom-styled dialog is acceptable if the app has a strong design language, but it must keep platform button ordering.

**Button order:** iOS Cancel is on the left (2-button horizontal) or bottom (action sheet); Android places the dismissive action left of the confirming action. React Native's `Alert` handles this if you supply styles correctly - verify on both platforms.

## 3. Destructive confirmations

Scale friction to consequence:

| Consequence | Friction |
| --- | --- |
| Reversible (archive, hide, remove from a list) | No dialog - do it and offer Undo in a snackbar |
| Irreversible but low stakes (delete a draft) | One-tap dialog |
| Irreversible, meaningful (delete a beneficiary, remove a card) | Dialog naming the object: "Remove HDFC ••4321?" |
| High stakes (close account, delete all data) | Dialog + typed confirmation or re-authentication |
| Money movement | Full confirmation screen with amount, destination and fee - never a dialog alone |

Never place a destructive action where an ordinary tap lands (row default action, primary button position) without confirmation.

## 4. Full-screen modals

Use for self-contained tasks. Requirements:
- Explicit **Cancel/Close** at the leading edge (or trailing on Android), always visible.
- A clear title stating the task.
- Primary action either in the header trailing position (short tasks: "Save") or as a sticky bottom CTA (input-heavy tasks).
- Dismissal with unsaved data confirms first, including swipe-down and hardware back.
- Presented with `presentation: 'modal'` / `'fullScreenModal'`; sensitive flows use `fullScreenModal` so an accidental swipe cannot cancel a payment.

## 5. Motion

- Dialog: fade + scale from 0.95, `fast`-`base` (140-220 ms). Never slide a dialog in from the side.
- Full-screen modal: slide up, `slow` (320 ms).
- Scrim fades in parallel with the content.
- Exit is faster than entry.
- Reduce motion: fade only.

## 6. Accessibility

- Focus moves into the dialog on open and returns to the trigger on close.
- `accessibilityViewIsModal` (iOS) and hiding background siblings (Android) - the reader must not escape behind the dialog.
- The dialog announces its title on open.
- Android hardware back dismisses non-blocking dialogs.
- Every action is a real button with a real label; the scrim is not the only escape.

## 7. Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Dialog to say "Saved successfully" | Toast, or nothing (the UI already shows it) |
| Dialog stacking on dialog | Queue, or restructure the flow |
| "Are you sure?" on a reversible action | Just do it, offer Undo |
| "OK"/"Cancel" on a destructive action | Use the verb |
| Rating/marketing prompt at launch | Trigger after a successful task, once, dismissible |
| Modal that cannot be dismissed on Android | Handle hardware back |
| Error dialog for a network failure in a list | Inline error state with retry |
| Dialog with a form inside | Full-screen modal or sheet |
| Custom dialog ignoring platform button order | Follow the platform |
