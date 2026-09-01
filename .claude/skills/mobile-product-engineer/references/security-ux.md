# Security UX

Security that is hostile gets worked around. The goal is protection the user barely notices, and complete clarity at the moments that matter.

## 1. Principles

1. Ask for authentication **proportional to risk** — not on every screen, and never zero on money movement.
2. Never expose full sensitive values by default.
3. Explain *why* before asking for anything sensitive.
4. Failures are specific enough to act on, vague enough not to help an attacker.
5. The user must always be able to see and end their own sessions.
6. Never use security theatre — fake badges, fake scans, meaningless "encrypted" banners.

## 2. Authentication ladder

| Risk | Requirement |
| --- | --- |
| Open the app | Biometric / device PIN if the user enabled app lock |
| View balance and history | Session valid |
| View full account number, statements | Re-auth if the session is old |
| Add a beneficiary | PIN or biometric |
| Send money | PIN or biometric, always |
| High-value or first-time recipient | PIN/biometric + OTP |
| Change PIN, email, phone, or security settings | Full re-auth + notification to the old contact |
| Log out all devices | Full re-auth |

Escalate for risk; do not apply the maximum everywhere.

## 3. Biometrics

- Offer at first launch after signup, with an explicit opt-in — never enable silently.
- **Always** provide a fallback (PIN/password). Biometrics fail: wet hands, masks, sensor damage.
- Use the platform prompt (`expo-local-authentication` / `react-native-biometrics`); never build a fake fingerprint UI.
- Prompt copy states what is being authorised: "Confirm payment of ₹5,000".
- On device-biometric change (new fingerprint enrolled), invalidate and require full re-auth. This is a real attack vector.
- Handle: no hardware, not enrolled, locked out after failures, user cancelled — each with a different, correct message.
- Never store credentials or PINs in AsyncStorage. Keychain / Keystore (`expo-secure-store`, `react-native-keychain`) only.

## 4. PIN entry

- Custom numeric keypad, not the system keyboard — it keeps the layout stable and avoids keyboard extensions.
- Dots fill as digits are entered; no digits ever displayed.
- Auto-submit on the final digit.
- Wrong PIN: shake, error haptic, clear the field, and state attempts remaining ("2 attempts left").
- Lock out after ~3–5 attempts with a stated cooldown and an unambiguous recovery path.
- "Forgot PIN" always visible on the entry screen.
- Disable screenshots on PIN screens (`FLAG_SECURE` on Android; blur/obscure on iOS backgrounding).
- Never log, never send the PIN in plaintext, never store it locally.

-> `keyboard-and-input.md`

## 5. Sessions

- Inactivity timeout on sensitive apps: 5–15 minutes typical. Warn ~60 seconds before, with an "I'm still here" option.
- Background timeout: re-auth after N minutes in the background.
- **Obscure the app-switcher snapshot** — blur or cover the screen on `AppState` change to `inactive`/`background`, so balances do not appear in the task switcher.
- Session expiry returns the user to where they were, after re-auth. Do not dump them on the home screen and lose their work.
- Log out clears in-memory state, cached balances and secure tokens.
- Provide an "Active sessions / devices" screen with device, location, last active, and a per-device and global sign-out.

## 6. Masking sensitive data

| Data | Default display |
| --- | --- |
| Account number | `•••• 4821` |
| Card number | `•••• •••• •••• 4821` |
| CVV | never displayed, never stored |
| Phone | `+91 ••••• ••821` |
| Email | `p•••••a@gmail.com` |
| Balance | visible, with a user-controlled mask toggle |
| PAN / national ID | `••••••821F` |
| OTP | never echoed back anywhere |

Reveal requires an explicit action, and for the most sensitive values, re-auth. Auto-hide after ~30 seconds. Provide copy-to-clipboard on identifiers rather than forcing the user to reveal and transcribe.

## 7. Permissions and data requests

- Prime in-app before the system dialog, stating the concrete benefit. -> `notifications.md`
- Request at the moment of need, never at launch.
- Handle permanent denial by routing to app settings with an explanation.
- Camera for KYC: explain what is captured, that it is used for verification, and that it is not shared.
- Contacts access for a send-money flow: explain that it stays on the device (if true) and offer a manual-entry path.
- Never request a permission the feature does not need.

## 8. Secure input hygiene

- `secureTextEntry` for passwords and PINs; offer a show/hide toggle on passwords (not on PINs).
- `autoComplete="off"`, `autoCorrect={false}`, `spellCheck={false}`, `textContentType="none"` on sensitive fields you do not want autofilled or learned by the keyboard.
- `textContentType="oneTimeCode"` for OTP — this one you *do* want autofilled.
- Disable clipboard on the most sensitive fields where policy requires it, but understand it hurts usability — do it only when genuinely required.
- Never place sensitive values into analytics events, crash reports or logs. Scrub them at the logger.

## 9. Communicating security honestly

Good:
- "We never store your card details." (only if true)
- "Your bank will send a code to •••••• 4821."
- "This device is signed in since 12 March, Mumbai."
- Explaining a rejected transaction in plain language.

Bad:
- Padlock icons and "bank-grade security" banners with nothing behind them.
- Fake scanning animations during verification.
- Vague "for security reasons" as the whole explanation.
- Security warnings on every screen — they train the user to ignore them.

## 10. Error messages

Specific enough to act on, generic enough not to leak:

| Situation | Say |
| --- | --- |
| Wrong password | "Email or password is incorrect." (never which one) |
| Account locked | "Too many attempts. Try again in 15 minutes, or reset your password." |
| Session expired | "You were signed out for security. Sign in to continue." |
| Blocked transaction | "We couldn't complete this for security reasons. Contact support with reference ABC123." |
| Device not recognised | "New device detected. We've sent a code to your registered number." |

Always give a path forward and, where relevant, a reference the user can quote to support.

## 11. Notifying the user

Send an out-of-band notification (push + email/SMS) for: password/PIN change, new device sign-in, beneficiary added, limits changed, contact details changed, large or unusual transaction.

Each notification states what changed, when, from which device, and includes a "This wasn't me" action. Notify the **old** email/phone when contact details change — otherwise an attacker's change is silent.

## 12. Checklist

- [ ] Auth requirement scales with risk; money movement always verified
- [ ] Biometric opt-in with a working fallback and correct failure handling
- [ ] Credentials/tokens in Keychain/Keystore, never AsyncStorage
- [ ] PIN screen: custom keypad, no echo, lockout, forgot path, screenshot-protected
- [ ] Inactivity + background timeouts, with a warning before expiry
- [ ] App-switcher snapshot obscured
- [ ] Sensitive values masked by default; reveal is explicit and auto-hides
- [ ] Permissions primed in context, denial handled
- [ ] Sensitive data absent from logs, analytics and crash reports
- [ ] Auth errors specific but non-leaking, always with a next step
- [ ] Out-of-band notifications for security-relevant changes, with "not me"
- [ ] Active sessions visible and revocable
- [ ] No security theatre
