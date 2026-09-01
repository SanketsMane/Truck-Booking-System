# Android

Feel Android-native, keep your own brand. Material is a source of *behaviour* conventions, not a skin to paste on.

## 1. What to take from Material, what to leave

| Take | Leave |
| --- | --- |
| Touch target minimums, ripple feedback, edge-to-edge, predictive back, system bar handling, a11y semantics, motion easing intent | Default purple/teal palette, stock component shapes, Material fonts, Material iconography as your whole icon set |

Using MD3 components (`react-native-paper`, etc.) is fine **only** if the project already does. Never introduce a component library to skin one screen.

## 2. Edge-to-edge (mandatory on modern Android)

Android 15+ (API 35) enforces edge-to-edge; `windowSoftInputMode`/inset opt-outs are deprecated. Assume your content draws under the system bars.

- Expo: `expo-system-ui` + `react-native-edge-to-edge`, or `androidNavigationBar` / `androidStatusBar` in app config.
- Bare RN: `WindowCompat.setDecorFitsSystemWindows(window, false)` in `MainActivity`.
- Draw a **translucent or transparent** status bar; never a solid brand block unless the design calls for a coloured app bar.
- Apply insets with `react-native-safe-area-context` (`useSafeAreaInsets`), not hardcoded padding. -> `safe-areas.md`
- The 3-button navigation bar and the gesture pill need different bottom insets. Read the inset; never assume 48 or 24.

**Test both** gesture navigation and 3-button navigation. They are different bottom insets and different back affordances.

## 3. Back behaviour

Back is a **system-level guarantee** on Android. Every screen must answer "what does back do here?".

- Hardware/gesture back must never dead-end or exit the app from a nested screen.
- Modals, sheets and search overlays must consume back to dismiss themselves before back pops the stack.
- On the root tab, back returns to the first tab, then exits. Do not trap the user.
- Unsaved input: back triggers a discard confirmation, not silent loss.

**Predictive back** (Android 14+, default on 16+): declare `android:enableOnBackInvokedCallback="true"` and use `BackHandler`/navigation-library APIs that support the predictive callback. Old `onBackPressed` overrides break the preview animation. React Navigation supports this on recent versions — verify the installed version rather than assuming.

## 4. Press feedback

Every tappable surface shows feedback within ~100 ms.

- Use `Pressable` with `android_ripple={{ color: overlay.pressed, borderless: false }}` — the platform-correct affordance.
- Bounded ripple for rows, cards and buttons; borderless (`borderless: true`, with `radius`) for icon-only controls.
- Ripple must be clipped to the component's radius — set `overflow: 'hidden'` on the pressable container or the ripple bleeds past rounded corners.
- Do **not** ship iOS-style opacity fade as the only Android feedback. Branch on `Platform.OS` or wrap once in a shared `<Touchable>` component.

## 5. Navigation patterns

| Pattern | Use when |
| --- | --- |
| Bottom navigation (3–5 destinations) | Top-level, peer sections. Labels always visible. No more than 5. |
| Navigation rail / drawer | Tablets, foldables, or >5 top-level destinations |
| Top app bar | Screen title + up affordance + ≤2 actions; overflow the rest into a `⋮` menu |
| FAB | Exactly one primary creation action per screen, bottom-right, above the bottom nav |

Bottom nav must sit above the gesture inset, keep a 48 dp target height for each item, and never scroll away on the root screens.

## 6. Dialogs, sheets and menus

- **Dialog** for a decision that blocks progress. Buttons are text buttons, right-aligned, confirming action rightmost. No more than two actions.
- **Bottom sheet** for a set of choices or supplementary content; drag handle at top; dismiss on scrim tap and back. -> `bottom-sheets.md`
- **Menu (`⋮`)** anchored to its trigger for overflow actions.
- **Snackbar** for transient confirmation with optional single undo — sits above the bottom nav and FAB, never covering them. -> `toast-and-feedback.md`

Do not use dialogs for information that could be a screen, a section or a snackbar.

## 7. Typography and density

- System font is Roboto; a brand font is fine if it ships with the app and has proper weights. Verify it renders with correct metrics on Android — line-height handling differs from iOS.
- Android text sits tighter than iOS. Set explicit `lineHeight` on every text style; do not rely on defaults matching across platforms.
- `includeFontPadding: false` on headings and numeric displays to kill Android's extra vertical padding, but keep it on for body text in scripts that need the ascent (Devanagari, Thai) or descenders clip.
- `textAlignVertical: 'center'` for single-line rows.
- Respect the system font scale (Settings → Display → Font size). Test at 1.3× and 2.0×. -> `accessibility.md`

## 8. Dynamic colour (Material You)

Optional and **opt-in per product**. Fintech and brand-led apps generally should *not* adopt wallpaper-derived colour — brand consistency and trust outrank personalisation.

If adopted: apply dynamic colour to neutral surfaces only, keep `brand.primary`, status colours and money colours fixed. Never let wallpaper decide what "success" or "error" looks like.

## 9. Keyboard

- `windowSoftInputMode` behaviour differs from iOS; use `KeyboardAvoidingView` with `behavior="height"` on Android or, better, `react-native-keyboard-controller` for parity. -> `keyboard-and-input.md`
- Test with a third-party keyboard (Gboard, SwiftKey) — heights and suggestion strips vary.
- IME action on the last field submits; earlier fields advance focus (`returnKeyType`, `onSubmitEditing`).

## 10. Permissions

- Runtime permissions are per-permission and revocable. Never request on app launch.
- **Prime first**: an in-app screen explaining the value, then the system dialog on the user's tap. -> `notifications.md`
- Handle three outcomes: granted, denied, "don't ask again" (route to app settings with a clear explanation).
- `POST_NOTIFICATIONS` is a runtime permission on Android 13+. Request it at the moment notifications become useful, not at first launch.

## 11. Lifecycle and state

- Activities can be recreated on configuration change (rotation, font scale, theme, locale, foldable posture). State in component memory is lost — hoist important state to a store or persist it.
- Handle background/foreground (`AppState`) for: session locking, balance refresh, timer accuracy, secure-screen blanking.
- Low-memory devices kill backgrounded apps aggressively. A returning user must land somewhere sensible, not a blank stack.
- Long-running work belongs in a foreground service or WorkManager, not a JS timer.

## 12. Dark mode

Follows the system by default (`useColorScheme`). Set the Android theme's `windowBackground` to your dark canvas so cold starts do not flash white. -> `dark-mode.md`

## 13. Accessibility specifics

- TalkBack: verify swipe-through order, that decorative images are excluded (`accessibilityElementsHidden` / `importantForAccessibility="no"`), and that custom controls announce role + state.
- Group a row into a single focusable node with one combined label rather than 4 separate stops.
- 48 dp minimum target — Android's accessibility scanner flags less.
- Support "Remove animations" (`AccessibilityInfo.isReduceMotionEnabled`).

## 14. Android review checklist

- [ ] Edge-to-edge; content not under the status bar or nav bar unintentionally
- [ ] Both gesture and 3-button navigation tested
- [ ] Predictive back works; back never dead-ends; sheets/modals consume back
- [ ] Ripple on every tappable, clipped to radius
- [ ] Bottom nav clears the gesture inset; FAB clears the bottom nav
- [ ] Font scale 1.3× and 2.0× do not clip or overlap
- [ ] Keyboard does not cover the focused field or the CTA
- [ ] Cold start does not flash the wrong theme
- [ ] Rotation / recreation preserves state
- [ ] TalkBack pass: order, labels, roles, states
