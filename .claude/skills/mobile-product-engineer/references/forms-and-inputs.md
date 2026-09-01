# Forms & Inputs

Forms are where mobile apps lose users. Every field is a cost; every error is a chance to quit.

## 1. Form architecture

- **One column, always.** Side-by-side fields only for genuinely paired short values (expiry MM / YY, first / last name on wide screens) and never below 360 dp width.
- **Ask for the minimum.** Every field must be justified. Derive what you can (city from postcode, bank from IFSC/routing number, name from KYC data already held).
- **Group logically** with 16 between fields and 32 between groups, each group with a `label`/`overline` heading.
- **Long forms become steps.** More than ~7 fields or more than one conceptual topic -> a stepped flow with progress and per-step validation.
- **Sticky primary CTA** at the bottom for single-decision forms; it sits above the keyboard when open.
- **Never lose input.** Persist drafts on background/kill for anything longer than 3 fields. Confirm before discarding on back.

## 2. Field anatomy

```
Label                 13/600 text.secondary, always visible, sentence case, no colon
[ Field 52 tall ]     radius 12, 16 horizontal padding, body 16 text (never below 16 - iOS zooms and it reads small)
Helper / error        12/400; helper text.tertiary, error status.error.text
```

- **Never placeholder-only.** Placeholders vanish on typing, fail contrast, and break accessibility. A floating label is acceptable if it settles into a persistent label.
- Placeholder shows an *example* ("e.g. 9876543210"), not a repeat of the label.
- Optional fields are marked "(optional)"; do not mark required fields with asterisks - make optional the exception.
- Character counters only where a hard limit exists, shown from 80% of the limit.

## 3. Keyboard configuration

| Field | Config |
| --- | --- |
| Email | `keyboardType="email-address"`, `autoCapitalize="none"`, `autoCorrect={false}`, `textContentType="emailAddress"`, `autoComplete="email"` |
| Phone | `keyboardType="phone-pad"`, `textContentType="telephoneNumber"`, `autoComplete="tel"` |
| Amount | `keyboardType="decimal-pad"` (iOS) / `"numeric"` (Android); never `number-pad` if decimals are allowed |
| OTP | `keyboardType="number-pad"`, `textContentType="oneTimeCode"` (iOS), `autoComplete="sms-otp"` (Android) |
| Name | `autoCapitalize="words"`, `textContentType="name"` |
| Password | `secureTextEntry`, `textContentType="password"` / `"newPassword"`, `autoComplete` set, visibility toggle |
| Card number | `keyboardType="number-pad"`, `textContentType="creditCardNumber"`, formatted in groups of 4 |
| Address | `textContentType` per subfield to enable autofill |
| Search | `returnKeyType="search"` |

- `returnKeyType="next"` on all but the last field; the last uses `"done"` or `"go"` and submits.
- Wire `onSubmitEditing` to focus the next field via refs. A form where Return does nothing feels broken.
- Never disable paste - especially on OTP, card and code fields.

## 4. Validation

**Timing:**
- Do not validate while the user is first typing a field. Wait for blur, or for the field to become plausibly complete (e.g. 10 digits entered).
- Once a field has shown an error, re-validate on every keystroke so the error clears as soon as it is fixed.
- Validate the whole form on submit; focus and scroll to the first invalid field and announce it.
- Async validation (username taken, account exists) is debounced 400-600 ms with an inline spinner in the field.

**Rules:**
- Never block typing. Filter/format on change (digits only, grouping), but do not silently drop pasted content the user can fix.
- Accept generous formats and normalise: spaces in card numbers and IBANs, `+` and hyphens in phone numbers, upper/lowercase in codes.
- Trim whitespace on submit, never mid-typing.
- Show constraints up front ("Minimum 8 characters, one number") as helper text, not as an error after failing.

**Error copy** (see `microcopy.md`): state what is wrong and how to fix it. "Enter a 10-digit mobile number", not "Invalid input".

## 5. Amount / currency input

- Right-align or centre a hero amount; use `amountL`/`amountXL` with tabular figures.
- Currency symbol is a fixed prefix element, not part of the editable text.
- Format with grouping separators as the user types, preserving cursor position, using the locale's separators.
- Enforce decimal places for the currency (2 for most, 0 for JPY/KRW); block a third decimal instead of rounding silently.
- Show constraints inline: available balance, minimum, maximum, and the fee if any.
- Validate over-limit *as they type* with a non-blocking message and a disabled-with-reason CTA - never let them reach the confirm screen to be rejected.
- Offer quick-amount chips (₹100 / ₹500 / ₹1,000 or "Max") for common values; they set the field, they do not submit.
- Never use a `TextInput` with `keyboardType="numeric"` for amounts on Android without stripping non-numeric characters - some keyboards still allow them.

## 6. OTP / code entry

- Single hidden input backing N visible boxes, or a native code field. Do not create N independent inputs that break paste and autofill.
- Auto-submit on the final digit; show a spinner in place, do not navigate before the response.
- Support autofill: `textContentType="oneTimeCode"` (iOS), `autoComplete="sms-otp"` (Android). On Android, consider the SMS Retriever API so no SMS permission is needed.
- Resend: disabled with a visible countdown ("Resend in 0:24"), then enabled. Offer an alternative channel (call, email) after two failures.
- Wrong code: clear the boxes, keep focus, show the error, and state attempts remaining if limited.
- Never mask OTP digits, and never disable paste.

## 7. Pickers and selection

| Options | Control |
| --- | --- |
| 2-3 | Segmented control or radio rows visible inline |
| 4-8 | Bottom sheet list with the current value checked |
| 9+ | Searchable full-screen picker |
| Date | Native date picker; never three dropdowns |
| Country/currency | Searchable list with flags/codes and recent/likely values at the top |

The field always shows the current value plus a chevron and is at least 48 tall.

## 8. Keyboard behaviour

See `keyboard-and-input.md`. Non-negotiables:
- The focused field is never covered.
- The submit button is reachable without dismissing the keyboard (sticky above it) on single-decision forms.
- `keyboardShouldPersistTaps="handled"` so the first tap on a button works.
- Tapping outside dismisses (except where it would obscure a live-search result list).

## 9. Submission

- Disable the button on press and show `loading` in place - never let a double tap create two payments.
- Show a specific failure message and keep all entered data.
- On success, navigate or confirm decisively; do not leave the user on a form that looks unchanged.
- Network timeout: after ~10 s, tell the user what is happening and offer to retry; for money movement, check status before allowing a retry (see `fintech-ux.md`).

## 10. Accessibility

- Label is programmatically associated: `accessibilityLabel` on the input matching the visible label.
- Errors use `accessibilityLiveRegion="polite"` (Android) / `AccessibilityInfo.announceForAccessibility` (iOS) and are referenced by the field's `accessibilityHint`.
- Required/invalid state exposed via `accessibilityState={{ ...(invalid && { invalid: true }) }}` or a labelled error.
- Field order matches visual order; focus moves logically.
- Do not rely on colour alone for an invalid field - include the message and an icon.

## 11. Form checklist

- [ ] Every field justified and labelled
- [ ] Correct keyboard, autofill and return key per field
- [ ] Validation on blur, clears on fix, whole-form on submit
- [ ] Errors specific, actionable, and never lose data
- [ ] Keyboard covers nothing; CTA reachable
- [ ] Amounts formatted, limited and validated live
- [ ] Draft persistence for long forms; discard confirmation on back
- [ ] Double-submit impossible
- [ ] Works at 200% font scale
- [ ] Screen reader can complete the form end to end
