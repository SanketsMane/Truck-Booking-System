# Notifications

Push, in-app and badges. The permission is the scarcest resource in the app - never spend it on a cold prompt.

## 1. Permission priming

**Never call the OS prompt on first launch.** iOS gives one chance; Android 13+ also gates it.

Sequence:
1. Let the user experience value first (complete onboarding, make one transaction, set one alert).
2. Show an in-app priming screen/sheet: what they will get, how often, and the benefit. Concrete: "Get alerts when money arrives, and for payment failures." Not: "Enable notifications for a better experience."
3. Two options: "Turn on alerts" (primary) and "Not now" (secondary, not a trap).
4. Only on the affirmative do you call the OS prompt.
5. If they decline the OS prompt, do not ask again in-app; offer a settings entry point ("Notifications: Off - Turn on") and deep-link to system settings.
6. If they tap "Not now", you may re-prime once, much later, at a more relevant moment.

Same pattern for camera, contacts, location and biometrics. See `security-ux.md`.

## 2. Categories and control

- Give users granular in-app controls that map to real categories: transactions, security, offers, reminders. Store the preference server-side.
- **Android:** create notification channels per category at first use, with correct importance. Users can then control each channel in system settings; you cannot change a channel's importance later, so define them carefully (`transactions` = HIGH, `promotions` = LOW).
- **iOS:** use notification categories with actions; consider provisional authorisation (quiet delivery) for non-critical categories, and time-sensitive interruption levels only for genuinely urgent ones (payment failed, security alert). Do not abuse critical/time-sensitive.
- Security and transaction alerts should be non-disableable in-app only if legally required; otherwise let users choose and warn them of the consequence.

## 3. Push content

- **Title:** what happened. **Body:** the specifics.
  - Good: "Money received - ₹2,500 from Ravi Kumar. Balance ₹18,340."
  - Bad: "You have a new notification."
- Never put full sensitive data in a notification that shows on a locked screen: mask account numbers, avoid full balances if the user has enabled privacy mode. Provide a setting for "hide amounts on lock screen".
- Deep-link every notification to the exact screen (transaction detail), building a proper back stack.
- Group related notifications (Android groups + summary; iOS thread identifiers) so 10 transactions do not become 10 separate alerts.
- Localise and format currency/date via the same formatters as the app.
- Silent/data pushes for sync only; never rely on them for delivery guarantees.

## 4. In-app notifications

When a push arrives while the app is foregrounded, do **not** show the OS banner blindly. Show an in-app banner styled by your design system:
- Top of the screen, below the status bar, `surface.raised`, elevation 3.
- Auto-dismiss after 4-5 s, swipe up to dismiss, tap to navigate.
- Never interrupt a payment/PIN/OTP screen with an in-app banner - queue it.
- Refresh the underlying data too: a "money received" push should update the balance if that screen is visible.

## 5. Notification inbox

If the app keeps a notification history:
- Group by date, mark unread with a dot (not colour alone), and show relative times ("2h ago").
- Each item deep-links to its subject.
- Provide "Mark all as read"; clearing the badge must be immediate and optimistic.
- Empty state explains what will appear here.
- Do not mix marketing and transactional history without a filter.

## 6. Badges

- App icon badge = count of actionable unread items only. Never a marketing count.
- Tab badges: number for actionable counts, dot for "something new", capped at "99+".
- Clear badges when the user has actually seen the content, not when the app opens.
- Keep the server count and the local count in sync; a badge that never clears trains users to ignore it.

## 7. Timing and frequency

- Respect quiet hours and the user's timezone for non-urgent messages.
- Hard cap promotional pushes (e.g. <= 2/week) and make them separately controllable.
- Transactional alerts are immediate and unthrottled.
- Never send "we miss you" pushes to a user who has disabled marketing.

## 8. Implementation notes

- `expo-notifications` (Expo) or `@react-native-firebase/messaging` + `notifee` (bare) for rich display, channels and actions.
- Register the token after permission is granted, refresh on rotation, and delete it on logout - otherwise the next user of the device receives the previous user's alerts. This is a security defect, not a bug.
- Handle three states: foreground, background, cold start from a notification tap. Test all three.
- Android 13+ requires the `POST_NOTIFICATIONS` runtime permission; older versions do not - branch correctly.
- iOS needs the correct capabilities and an APNs key; test on a real device, notifications do not work on the simulator for remote push.

## 9. Checklist

- [ ] No permission prompt before value is demonstrated
- [ ] Priming screen with concrete benefits
- [ ] Categories/channels defined with correct importance
- [ ] Every notification deep-links correctly, cold and warm
- [ ] Sensitive data masked on the lock screen
- [ ] In-app banner styled by the design system, never over a PIN/OTP screen
- [ ] Badges reflect actionable items and clear correctly
- [ ] Token deleted on logout
- [ ] Foreground / background / cold-start all tested
