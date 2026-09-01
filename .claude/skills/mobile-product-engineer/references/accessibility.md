# Accessibility

Built in during implementation, never bolted on afterwards. Add the props as you write each element.

## 1. Non-negotiables

1. Touch targets ≥ 48×48 dp (Android) / 44×44 pt (iOS). Use **48 as the universal floor**; `hitSlop` for visually smaller controls. ≥ 8 dp between adjacent targets.
2. Body text contrast ≥ 4.5:1; large text (≥ 18.66 pt bold / ≥ 24 pt) and meaningful icons/borders ≥ 3:1.
3. Colour is never the only carrier of meaning — pair with icon, text or position.
4. Every interactive element has an accessible name and a role.
5. Text scales with the system font setting. Never `allowFontScaling={false}` on content text.
6. Reduce Motion is honoured.
7. Errors are announced, not just coloured.

Any of these missing is a defect, not a nice-to-have.

## 2. Labels, roles, states

```tsx
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel="Send money"
  accessibilityHint="Opens the transfer screen"       // only if the result is not obvious
  accessibilityState={{ disabled, selected, busy, checked, expanded }}
  accessibilityValue={{ text: '₹12,480.50' }}          // sliders, progress, amounts
/>
```

| Prop | Rule |
| --- | --- |
| `accessibilityLabel` | What it is/does, in words. No "button" in the label — the role says that. Never leave an icon-only control unlabelled. |
| `accessibilityRole` | `button`, `link`, `header`, `image`, `switch`, `checkbox`, `radio`, `tab`, `search`, `progressbar`, `alert`, `summary` |
| `accessibilityHint` | Only when the outcome is non-obvious. Not a repeat of the label. |
| `accessibilityState` | Must reflect **live** state — a disabled button that does not announce disabled is a trap |
| `accessibilityValue` | Numeric/range values, formatted for speech |

**Icon-only buttons are the most common failure.** Every one needs a label.

## 3. Grouping

A list row with an avatar, name, subtitle, amount and chevron should be **one** focusable node, not five stops.

```tsx
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel="Priya Sharma, sent ₹1,250, 12 March, completed"
>
```

Order the combined label the way a person would read it aloud: who, what, how much, when, status. Hide decorative children with `importantForAccessibility="no-hide-descendants"` (Android) / `accessibilityElementsHidden` (iOS).

Conversely, do **not** collapse a row that contains two independent actions into one node — expose the secondary action via `accessibilityActions`.

## 4. Dynamic type

- Test at the system maximum standard size and at least one Accessibility size.
- Layouts must **reflow**: rows grow taller, side-by-side becomes stacked, truncation is a last resort.
- Cap scaling only on large numeric displays: `maxFontSizeMultiplier={1.3}`. Never below 1.0, never disabled.
- Fixed-height rows are the enemy — use `minHeight` and let content grow.
- Icons paired with text should scale roughly with it, or the pairing looks wrong at 2×.

-> `typography.md`, `responsive-mobile.md`

## 5. Contrast

| Element | Minimum |
| --- | --- |
| Body text, labels, captions | 4.5:1 |
| Large text | 3:1 |
| Icons and graphics carrying meaning | 3:1 |
| Borders that are the only affordance (e.g. an outlined input) | 3:1 |
| Focus indicators | 3:1 against both the component and the background |
| Disabled text | exempt, but must still be legible enough to read |

Check in **both** light and dark themes. Grey-on-grey in dark mode is the usual failure. Placeholder text at 3:1 is a very common violation — placeholders are content.

-> `colors.md`, `dark-mode.md`

## 6. Screen readers

Test with **TalkBack** (Android) and **VoiceOver** (iOS) — actually swipe through the screen.

- Reading order follows visual order. If it does not, the layout hierarchy is wrong.
- Headings marked with `accessibilityRole="header"` so users can jump by heading.
- Modals/sheets: focus moves into them on open, back to the trigger on close, and the background is not reachable (`accessibilityViewIsModal` on iOS, `importantForAccessibility="no-hide-descendants"` on the background for Android).
- Announce async results: `AccessibilityInfo.announceForAccessibility('Payment successful')`, or `accessibilityLiveRegion="polite"` (Android) / `accessibilityRole="alert"`.
- Loading states announce "Loading"; do not leave a silent screen.
- Never trap focus anywhere without an escape.

## 7. Motion and animation

```tsx
const reduceMotion = useReducedMotion();
```

- Slides/scales/parallax → cross-fade or instant.
- Stop looping and pulsing animations.
- Keep essential feedback. Reduced motion means less movement, not less information.
- Auto-playing carousels must pause under Reduce Motion, and always offer manual control.

## 8. Forms

- Every input has a **visible** label, not just a placeholder. Placeholders vanish on focus and fail screen readers.
- Associate errors with their field: `accessibilityLabel` includes the error, or set `accessibilityInvalid`/announce on failure.
- Error text is adjacent to the field, in words, with an icon — never colour alone. -> `error-states.md`
- Required fields marked in text, not only with a red asterisk.
- Move focus to the first invalid field on failed submit and announce the count of errors.

-> `forms-and-inputs.md`

## 9. Colour independence

Every state must survive greyscale:

| State | Colour + |
| --- | --- |
| Success | check icon + "Completed" |
| Pending | clock icon + "Pending" |
| Failed | alert icon + "Failed" |
| Credit / debit | `+` / `−` sign and direction, not just green/red |
| Selected | checkmark, border weight or position, not just tint |
| Required | the word "Required" |

Screenshot the screen, desaturate it, and confirm you can still read every state. -> `fintech-ux.md`

## 10. Other settings to honour

- **Bold Text** (iOS): weights shift; verify layouts do not break.
- **Increase Contrast / Reduce Transparency**: strengthen borders, drop blur.
- **Larger text at Accessibility sizes**: layouts reflow.
- **Switch Control / Voice Control**: labels double as voice commands — make them natural phrases ("Send money", not "btn_send_1").
- **Dark mode**: a system preference, not a style. -> `dark-mode.md`

## 11. Testing

| Tool | Platform |
| --- | --- |
| TalkBack + Accessibility Scanner | Android |
| VoiceOver + Accessibility Inspector | iOS |
| Font scale at max | Both |
| Greyscale filter | Both |
| Contrast checker on exported colours | Design-time |
| `eslint-plugin-react-native-a11y` | Code-time |

## 12. Checklist

- [ ] Every interactive element: label + role
- [ ] Icon-only buttons labelled
- [ ] Rows grouped into single, well-ordered nodes
- [ ] States (disabled, selected, busy, checked) announced and live
- [ ] Targets ≥ 48 dp with ≥ 8 dp separation
- [ ] Contrast passes in light **and** dark
- [ ] Font scale 2.0× reflows without clipping
- [ ] Reading order matches visual order
- [ ] Modals trap and restore focus
- [ ] Async results announced
- [ ] Reduce Motion honoured
- [ ] Greyscale test passes
- [ ] Screen-reader pass done on both platforms
