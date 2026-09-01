# Navigation

Structure decisions come from `ux-architecture.md`; this file is the implementation and behaviour contract.

## 1. Choosing the model

| Structure | Pattern |
| --- | --- |
| 2-5 equal top-level areas | Bottom tab bar |
| Depth within an area | Native stack per tab |
| A self-contained task (send money, KYC, add card) | Modal stack presented over everything, with Cancel |
| A short sub-task keeping context | Bottom sheet, not a screen |
| A view switch inside one screen | Top tabs / segmented control |
| More than 5 top-level areas | Restructure, or 4 tabs + "More" |
| Auth vs app | Two separate navigators switched by session state, not a screen inside the app stack |

Never: tabs inside tabs, a drawer as the primary navigation on a phone (acceptable only as a secondary menu in a tool-like app), or a stack whose back button leads somewhere the user never was.

## 2. Bottom tabs

- 2-5 items. Icon (24) + label (11-12). Always keep labels - icon-only tabs fail recognition and accessibility.
- Active: filled icon variant + `brand.primary` + weight 600. Inactive: outline + `text.secondary`. Colour alone is not enough.
- Height 56 content + `insets.bottom`. Background `surface.default` with a hairline top border, or a blur on iOS if the app style calls for it (and only with a fallback colour).
- Tapping the active tab scrolls its list to top; a second tap pops its stack to root.
- Each tab keeps its own navigation state across switches.
- Badges: dot for "something new", number for actionable counts, capped at 99+.
- Never hide the tab bar on scroll for a primary app - it costs more than it gains. Do hide it on pushed detail screens where a sticky action bar takes its place.

## 3. Stacks and headers

- Use `@react-navigation/native-stack` (native primitives, correct gestures, better performance) over the JS stack unless a specific custom transition requires otherwise.
- Header: back at the leading edge, title centred (iOS) or leading (Android), <= 2 trailing actions.
- Title matches the destination, not the source. Long titles truncate; never wrap the header to two lines - use a large-title screen instead.
- Screens that are pushed keep the tab bar hidden or visible consistently across the whole app - decide once.

## 4. Back behaviour (both platforms)

- Back always reverses the last navigation. It never submits, never advances, never silently discards.
- **Unsaved input:** intercept back and confirm ("Discard changes?" / "Keep editing"). Applies to Android hardware/gesture back, iOS swipe-back and the header button.
- After a successful transaction, back must not return to the confirmation screen. Reset the stack to the appropriate root.
- Android: implement `BackHandler`/`beforeRemove` for every intercept - a modal that ignores hardware back is a bug. Support predictive back (see `android.md`).
- iOS: never disable the interactive swipe-back gesture unless the screen must not be dismissible (payment in progress); if disabled, ensure an explicit Cancel exists.

## 5. Modal presentation

| Presentation | When |
| --- | --- |
| `card` push | Continuing the same context |
| `modal` (sheet, iOS) | A separable task; swipe-down to dismiss with a confirm if data would be lost |
| `fullScreenModal` | Long or sensitive flows (payments, KYC) where accidental dismissal is costly |
| `transparentModal` | Custom overlays, in-app notifications |

Modals always expose an explicit Cancel/Close - never rely on the gesture alone.

## 6. Deep links and notifications

- Every meaningful screen has a route with params typed.
- Opening a deep link builds a sensible back stack (detail -> its list -> root), never a screen with nowhere to go back to.
- If auth is required, capture the intent, authenticate, then continue to the target - do not drop the user on Home.
- Handle both cold start and warm resume paths.
- Validate params; a malformed link lands on a safe screen with a clear message, never a crash.

## 7. Navigation state and params

- Pass IDs, not objects. Fetch by ID on the destination so refresh and deep links work identically.
- Never store large or sensitive data in navigation params (they can persist in state and logs).
- Type the param list (`RootStackParamList`) and use typed hooks; untyped `navigate('Foo', {...})` is a defect.
- Guard double navigation: rapid double taps must not push a screen twice (debounce or check `navigation.isFocused()`).

## 8. Transitions

- Push/pop: platform default (iOS slide from right with the parallax, Android fade-through/slide-up).
- Modal: slide up from the bottom, `slow` (320 ms).
- Tab switch: no animation, or a cross-fade under 150 ms. Never slide between tabs.
- Custom shared-element transitions only when the same visual object persists across screens, and they must degrade gracefully.
- All transitions are interruptible; a fast back-tap during a push must not queue up two screens.

## 9. Scroll and focus behaviour

- Restore scroll position when returning to a list.
- Refresh stale data on focus (`useFocusEffect`) without blanking the screen - keep content, refresh in the background.
- New screens start at the top and, on iOS, announce their title to VoiceOver (`accessibilityViewIsModal` for true modals).
- Move screen-reader focus to the new screen's title after navigation.

## 10. Common navigation defects

| Defect | Fix |
| --- | --- |
| Back from payment success returns to the payment form | `navigation.reset` to root on success |
| Tab bar covers the last list item | Bottom content padding includes `tabBarHeight + insets.bottom` |
| Hardware back closes the app from a deep-linked detail screen | Build a proper back stack for deep links |
| Two screens pushed on a double tap | Debounce navigation |
| Modal cannot be closed on Android | Handle hardware back explicitly |
| Header title says "Details" everywhere | Use the object's name |
| Typed text lost on back | Intercept and confirm, or persist as a draft |
| Nested scroll views fighting | One vertical scroll per screen |
