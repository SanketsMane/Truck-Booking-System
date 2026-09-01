# Keyboard and input

The keyboard covers up to half the screen. Design the screen for the keyboard-open state, not only the closed one.

## 1. Hard rules

1. The focused field is **always** visible.
2. The primary CTA is reachable while typing — either visible above the keyboard or reachable with one scroll.
3. The correct keyboard type appears for every field.
4. There is always a way to dismiss the keyboard: tap outside, scroll, or an explicit Done.
5. Nothing important is permanently hidden behind the keyboard.

## 2. Avoidance strategy

Preferred: **`react-native-keyboard-controller`** — synchronised, frame-accurate movement on both platforms, and the closest thing to native feel. Use `KeyboardAvoidingView` from that library, or `KeyboardAwareScrollView`.

If the project already uses core RN and adding a dependency is not justified:

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={headerHeight}
  style={{ flex: 1 }}
>
```

`keyboardVerticalOffset` must equal the actual header height (`useHeaderHeight()`), not a guess. This is the single most common cause of "the field is still covered".

Android with edge-to-edge often needs `android:windowSoftInputMode="adjustResize"` plus inset handling; verify empirically on a real device.

## 3. Form screens

- Wrap the form in a scroll view with `keyboardShouldPersistTaps="handled"` — without it, the first tap only dismisses the keyboard and the user's button tap is swallowed.
- `keyboardDismissMode="interactive"` (iOS) or `"on-drag"` feels natural on long forms.
- `automaticallyAdjustKeyboardInsets` (iOS) handles simple cases with no extra wrapper.
- Scroll the focused field into view with comfortable clearance above the keyboard — the field plus its label plus any error text, not just the field's bottom edge.

## 4. Field ordering and focus

- `returnKeyType="next"` on every field except the last; `"done"` or `"send"` on the last.
- `onSubmitEditing` moves focus to the next `ref`. Chained focus is expected behaviour on mobile forms; skipping it feels broken.
- `blurOnSubmit={false}` on non-final fields so the keyboard does not flicker closed and open.
- Auto-focus the first field **only** when the screen exists solely for that input (search, OTP, amount entry). Otherwise the keyboard covering content on arrival is hostile.

## 5. Keyboard types and autofill

| Field | `keyboardType` | `textContentType` / `autoComplete` |
| --- | --- | --- |
| Email | `email-address` | `emailAddress` / `email` |
| Phone | `phone-pad` | `telephoneNumber` / `tel` |
| Amount / currency | `decimal-pad` | — |
| Integer, PIN, account no. | `number-pad` | — |
| OTP | `number-pad` | `oneTimeCode` / `sms-otp` |
| Password | default, `secureTextEntry` | `password` / `newPassword` |
| Name | `default` | `name`, `givenName`, `familyName` |
| Postcode | varies by locale | `postalCode` |
| Search | `default`, `returnKeyType="search"` | — |

Also set `autoCapitalize` (`none` for email/username), `autoCorrect={false}` for identifiers, and `spellCheck={false}` where correction would corrupt input.

Autofill and OTP auto-read are free UX wins. On a fintech app, failing to support `oneTimeCode` measurably costs conversions.

## 6. Number and amount entry

- `decimal-pad` for amounts; `number-pad` where decimals are impossible.
- Format as the user types (thousands separators), but keep the raw value in state and never move the caret unexpectedly.
- Currency symbol is a static adornment, not part of the editable text.
- Large, prominent amount typography — an amount field is the hero of its screen. -> `fintech-ux.md`
- Consider a custom numeric keypad **only** when the screen is amount-only (send money, top-up); it lets the CTA stay visible and removes keyboard-avoidance entirely. Never use a custom keypad for general text.
- Validate on blur and on submit, not on every keystroke. -> `forms-and-inputs.md`

## 7. OTP input

- Single hidden input behind styled boxes, or a purpose-built component. Do **not** use N separate `TextInput`s with manual focus juggling — it breaks paste, autofill and screen readers.
- `textContentType="oneTimeCode"` (iOS) and `autoComplete="sms-otp"` (Android) enable auto-fill from the SMS.
- Auto-submit when the last digit is entered.
- Paste of the full code must work.
- Show a resend timer; keep the error inline and the entered digits intact. -> `security-ux.md`

## 8. Sticky CTA above the keyboard

For a single-decision screen (amount, confirm, one-field form), pin the CTA to the keyboard's top edge so it is always visible:

- With `react-native-keyboard-controller`: `KeyboardStickyView`.
- Otherwise: animate the CTA container's bottom offset from the keyboard-height event, and clamp to `insets.bottom` when closed. -> `safe-areas.md`

Never let the CTA sit under the keyboard on a screen whose entire purpose is that one action.

## 9. Dismissal

- Tap outside dismisses (`Pressable` wrapper with `Keyboard.dismiss`, or `keyboardShouldPersistTaps="handled"` scroll).
- Scroll-to-dismiss on long forms.
- On iOS, a "Done" accessory above the number pad — number pads have no return key, so without it there is no way to dismiss on some layouts.
- Navigating away always dismisses.

## 10. Testing

- Real device with a third-party keyboard (Gboard/SwiftKey) — heights differ from the simulator.
- Landscape: the keyboard eats most of the screen; forms must still work.
- Large font scale + keyboard open simultaneously.
- Hardware keyboard attached (tablets, simulators) — the software keyboard never appears; layout must not depend on it.
- Sheets containing inputs, on both platforms.

## 11. Failure signatures

| Symptom | Cause |
| --- | --- |
| Field hidden behind keyboard | Missing/incorrect `keyboardVerticalOffset` |
| Button needs two taps | Missing `keyboardShouldPersistTaps="handled"` |
| Keyboard flickers between fields | `blurOnSubmit` not `false` on non-final fields |
| Wrong keyboard for a field | `keyboardType` not set |
| OTP never autofills | Missing `textContentType` / `autoComplete` |
| CTA unreachable on a one-field screen | No sticky/keyboard-anchored CTA |
| Content jumps on Android | Wrong `windowSoftInputMode` or double inset handling |
