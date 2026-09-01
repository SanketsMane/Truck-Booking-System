# Testing

*React Native testing. Kotlin/Android testing — including Room migration tests — is in
`../../android-app-engineer/references/testing.md`.*

Test what breaks and what costs money. Not coverage for its own sake.

## 1. What deserves a test

| Priority | What |
| --- | --- |
| Highest | Money maths, currency formatting, fee/total calculation, balance derivation |
| Highest | Payment/transfer flow end to end, including failure and double-submit |
| High | Auth, session expiry, PIN/biometric fallback paths |
| High | Form validation rules and error messages |
| High | State machines: transaction status, KYC status |
| Medium | Component states (loading, empty, error, disabled) |
| Medium | Navigation flows and back behaviour |
| Low | Static presentational components with no logic |

Never write a snapshot test as a substitute for a real assertion. A snapshot that everyone re-records on failure tests nothing.

## 2. Unit tests

Jest, or Vitest where the project uses it.

Priorities:
- **Currency**: formatting per locale, rounding, minor-unit conversion, negative values, very large values, zero. Money bugs are the ones that matter.
- Date/time formatting and timezone handling.
- Validation functions.
- Reducers, selectors, state machines.
- Pure business logic extracted out of components — which is a reason to extract it.

```ts
expect(formatCurrency(123456789, 'INR')).toBe('₹12,34,567.89'); // lakh grouping
expect(formatCurrency(0, 'INR')).toBe('₹0.00');                 // never blank
expect(formatCurrency(-50000, 'INR')).toBe('−₹500.00');
```

## 3. Component tests

`@testing-library/react-native`. Query by accessible role and label — the same handles a screen reader uses. This makes accessibility failures show up as test failures.

```tsx
const btn = screen.getByRole('button', { name: 'Send money' });
expect(btn).toBeDisabled();
```

Cover per component: default, loading, empty, error, disabled, and the accessible name/role. Assert on user-visible behaviour, never on internal state.

## 4. Integration and E2E

Maestro (simple YAML flows, low maintenance) or Detox (deeper native control). Pick one; do not run both.

Cover the flows whose failure is unacceptable:
- Sign-in, including biometric fallback
- Send money: happy path, insufficient funds, network failure mid-flight, double-tap on submit
- Add money / withdraw
- KYC submission and resume-after-interruption
- Session expiry and re-auth returning the user to their place

E2E is slow and brittle — keep the suite small and focused on money and auth.

## 5. Visual regression

Only worth it if the project already runs a Storybook or a screenshot pipeline. If so, snapshot key components in: light, dark, and largest font scale. Review diffs by eye — a visual diff tool that nobody reads is noise.

## 6. Accessibility in CI

- `eslint-plugin-react-native-a11y` catches missing labels and roles at lint time.
- Component tests that query by role fail when semantics are missing.
- Android Accessibility Scanner and Xcode Accessibility Inspector are manual, per-release checks — schedule them, do not skip them.

-> `accessibility.md`

## 7. Manual test matrix

Automation does not replace looking at it. Per screen:

| Axis | Values |
| --- | --- |
| Platform | iOS, Android |
| Device | smallest supported, largest supported |
| Theme | light, dark |
| Font scale | default, 2.0× |
| Network | fast, slow (throttled), offline |
| Data | empty, one item, many items, hostile strings |
| Android nav | gesture, 3-button |
| Motion | normal, Reduce Motion on |

-> `visual-qa.md`

## 8. Test data

Keep a fixture set of deliberately awkward data and use it everywhere:

- A 60-character merchant name
- An amount of ₹12,34,567.89 and one of ₹0.00
- A transaction in every status the API can return
- A user with no avatar, no last name, no transactions
- A response with null optional fields
- An error payload with a very long message

"John Doe / $100.00" hides every layout bug you have.

## 9. What not to do

- Snapshot tests of whole screens (they break on every change and assert nothing).
- Testing implementation details (state variable names, internal call counts).
- Mocking so heavily that the test only proves the mock works.
- Chasing a coverage percentage.
- E2E for things a unit test covers faster and more reliably.

## 10. Checklist

- [ ] Currency formatting unit-tested including edge values
- [ ] Money-movement flow covered end to end, including failure and double-submit
- [ ] Component states tested: loading, empty, error, disabled
- [ ] Queries use accessible roles and names
- [ ] Awkward fixture data used, not idealised data
- [ ] Manual matrix walked for new screens
- [ ] Lint (including a11y rules) and type-check pass in CI
