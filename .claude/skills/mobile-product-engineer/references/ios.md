# iOS

Feel iOS-native, keep your own brand. Follow Apple's *behaviour* conventions; do not clone Apple's visual identity.

## 1. What to take from HIG, what to leave

| Take | Leave |
| --- | --- |
| Safe areas, swipe-back, sheet detents, haptic vocabulary, Dynamic Type, navigation semantics, control affordances | System blue as your brand colour, stock grouped-table look as your entire visual language, SF Symbols as your only icon set (fine as a base, brand it) |

## 2. Safe areas

Never hardcode notch/Dynamic Island/home-indicator values.

- `useSafeAreaInsets()` from `react-native-safe-area-context`. -> `safe-areas.md`
- Content extends edge-to-edge; **padding** respects insets.
- Scroll views: let content scroll under the nav bar (translucent effect) but end with `contentInset`/`contentContainerStyle` bottom padding so the last row clears the home indicator.
- A bottom-pinned CTA needs `paddingBottom: max(insets.bottom, 16)`.
- Dynamic Island and notch devices differ — test both, plus an SE-class device with no top inset.

## 3. Navigation bars

- **Large titles** suit top-level, content-first, scrollable screens (Home, Activity, Settings root). They collapse to an inline title on scroll — that transition is the point.
- **Inline titles** for detail screens, forms, flows, and anything pushed 2+ levels deep.
- Do not use a large title on a screen where the first thing the user needs is a control or a number — it wastes the most valuable real estate.
- Back button: label it with the previous screen's short title when it fits; a bare chevron is acceptable when the title is long.
- **Swipe-back from the left edge must keep working.** If a screen disables it (`gestureEnabled: false`), that must be a deliberate decision (e.g. mid-payment), and an explicit close affordance must exist.
- Max 2 actions in the bar; overflow into the screen or a menu.

## 4. Tab bars

- 2–5 tabs, icon + label always. No badges without meaning.
- Tapping the active tab scrolls to top; double-tap or long-press may expose a shortcut menu.
- Tab bar is translucent over content; add bottom `contentInset` equal to the tab bar height so content is not permanently obscured.
- Never hide the tab bar on root screens. Hiding it on pushed detail screens is correct and expected.

## 5. Sheets and modal presentation

| Presentation | Use for |
| --- | --- |
| Sheet with detents (medium / large) | Contextual actions, pickers, quick forms, confirmations with detail |
| Full-screen modal | A self-contained task with its own flow (onboarding, KYC, a payment) — dismiss is "Cancel", not swipe |
| Push | Anything that is part of the same narrative and belongs in history |

- Sheets get a grabber when interactively dismissible, and dismiss on swipe-down + scrim tap.
- **Disable interactive dismissal** when the sheet holds unsaved input or a payment in progress; provide an explicit Cancel, and confirm discard.
- Stacked sheets (a sheet over a sheet) are a smell. Two deep is the absolute maximum.
- Modal headers: cancel/close on the left, confirming action on the right. -> `bottom-sheets.md`, `dialogs-and-modals.md`

## 6. Gestures

- Left-edge swipe = back (reserve it).
- Swipe-to-delete / swipe actions on list rows, with a destructive colour and an icon+label. Long-press for a context menu. -> `gestures.md`
- Pull-to-refresh on feeds and balances.
- Never bind a custom gesture that competes with the edge-swipe or the home-indicator swipe-up zone.

## 7. Typography and Dynamic Type

- SF Pro (system) is a strong default and costs nothing. A brand font is fine for display/headings; keep body text on a highly legible face.
- Support Dynamic Type: `allowFontScaling` stays **true** (the default) for body, labels and captions. Cap scaling on large numeric displays with `maxFontSizeMultiplier` (1.2–1.4) rather than turning scaling off.
- Never `allowFontScaling={false}` on body text. It is an accessibility defect.
- Test at the largest standard size and at least one Accessibility size. Layouts must reflow — rows grow taller, side-by-side becomes stacked.
- Use tabular figures (`fontVariant: ['tabular-nums']`) for money, counts and timers. -> `typography.md`

## 8. System controls

- Use platform-feeling switches, segmented controls, steppers and date pickers — users read them as trustworthy.
- `Switch` applies changes **immediately**; never pair a switch with a Save button.
- Segmented control for 2–4 mutually exclusive view filters. More than 4 → chips or a menu.
- Date/time: use the native picker (`@react-native-community/datetimepicker`) rather than a hand-rolled wheel.

## 9. Alerts vs everything else

- `Alert` is for a decision that must block: destructive confirmation, an error that stops the flow, a permission rationale.
- Two buttons ideally; destructive action styled `destructive`; Cancel is the cancel role so Escape/swipe maps correctly.
- Title is the question ("Delete this beneficiary?"), body is the consequence, buttons are verbs ("Delete" / "Keep").
- Do not use alerts for success, for information, or for anything that could be a toast or inline text.

## 10. Haptics

Meaningful, sparing, platform-idiomatic. -> `haptics.md`

| Event | Feedback |
| --- | --- |
| Selection change (segment, picker, tab) | Selection |
| Toggle, small confirmation | Impact light |
| Sheet snap, significant commit | Impact medium |
| Payment success, verification passed | Notification success |
| Validation failure, wrong PIN | Notification error |

Never haptic on scroll, on every keystroke, or as decoration.

## 11. Keyboard

- `KeyboardAvoidingView` with `behavior="padding"` on iOS, or `react-native-keyboard-controller` for smooth, synchronised movement.
- `keyboardDismissMode="interactive"` on long scrollable forms feels native.
- Correct `keyboardType` and `textContentType` for autofill: `oneTimeCode` for OTP, `telephoneNumber`, `emailAddress`, `newPassword`. Free autofill is real UX. -> `keyboard-and-input.md`
- Inputs inside a sheet must account for both the keyboard and the detent.

## 12. Dark mode

Follow the system (`useColorScheme`). Set `UIUserInterfaceStyle` correctly (or omit it to follow the system — setting it to `Light` disables dark mode entirely). Update the launch storyboard background so cold start does not flash. -> `dark-mode.md`

## 13. Accessibility specifics

- VoiceOver: logical order, combined row labels, roles (`accessibilityRole="button"`), and states (`accessibilityState={{ disabled, selected, busy }}`).
- `accessibilityValue` for sliders, progress and amounts.
- Respect Reduce Motion (`AccessibilityInfo.isReduceMotionEnabled`) — replace slides/scales with fades.
- Respect Reduce Transparency and Increase Contrast where you use blur or low-contrast dividers.
- Minimum target 44×44 pt; use `hitSlop` for smaller glyphs.

## 14. iOS review checklist

- [ ] Safe areas correct on notch, Dynamic Island and SE-class devices
- [ ] Swipe-back works, or is deliberately disabled with an explicit close
- [ ] Large title vs inline title is a decision, not a default
- [ ] Tab bar / nav bar translucency does not permanently obscure content
- [ ] Sheet detents and dismissal behaviour are correct; no accidental data loss
- [ ] Dynamic Type at the largest standard size reflows without clipping
- [ ] Keyboard avoidance smooth; OTP and autofill work
- [ ] Haptics meaningful and sparing
- [ ] VoiceOver pass: order, labels, roles, states
- [ ] Dark mode verified, including cold start
