# Gestures

Gestures are shortcuts for confident users. Every gesture needs a visible, discoverable alternative.

## 1. Rules

1. **A gesture is never the only way** to perform an action. Swipe-to-delete needs an overflow menu or a detail-screen delete too.
2. **Never fight the system.** iOS left-edge back and the bottom home-indicator swipe; Android back gesture and edge zones. Do not bind custom gestures there.
3. **Track the finger 1:1** during the gesture. Content that lags the finger feels broken.
4. **Velocity decides the outcome** on release, not just position. A fast flick past 20% should commit; a slow drag to 45% should snap back.
5. **Every gesture is cancellable** by dragging back past the threshold.
6. Confirm destructive gestures, or make them undoable. -> `toast-and-feedback.md`

## 2. The vocabulary

| Gesture | Standard meaning | Notes |
| --- | --- | --- |
| Tap | Primary action | Feedback within 100 ms |
| Long-press | Secondary/contextual menu | 400–500 ms, with haptic at the threshold |
| Swipe horizontally on a row | Row actions | ≤2 actions per side; colour + icon + label |
| Swipe from left edge | Back (iOS) | Reserved |
| Swipe down on a sheet | Dismiss / change detent | Grabber signals it |
| Pull down at top of list | Refresh | Only where refresh is meaningful |
| Swipe between tabs | Change tab | Only if tabs are a horizontal pager |
| Pinch | Zoom | Images, maps, documents only |
| Drag handle | Reorder | Explicit handle; do not overload long-press if long-press already has a meaning |
| Double-tap | Like / quick zoom | Rare; never the only path |

Do not invent new gestures. Users do not read tutorials.

## 3. Discoverability

Hidden gestures are only acceptable when they duplicate a visible affordance. Make them findable with:

- A grabber on sheets.
- Peeking content (the next carousel card partially visible) to signal horizontal scroll.
- A one-time hint on first use — animate the row 24 dp open and back, once, never again.
- Bounce/overscroll at list edges to reveal that pull-to-refresh exists.

Never ship a coach-mark overlay covering the whole screen as the solution to a discoverability problem. Fix the affordance instead.

## 4. Implementation

Use `react-native-gesture-handler` + `react-native-reanimated`. Core RN `PanResponder` runs on the JS thread and drops frames under load.

- Compose with `Gesture.Race`, `Gesture.Simultaneous`, `Gesture.Exclusive` — do not hand-roll conflict resolution.
- `activeOffsetX` / `failOffsetY` so a horizontal row swipe does not hijack vertical list scrolling. Getting this wrong makes lists feel sticky.
- Inside a scroll view, a pan must yield to the scroll unless it clearly starts horizontal.
- Gestures inside a bottom sheet must coordinate with the sheet's own pan (most sheet libraries expose a scroll-view integration — use it).

## 5. Thresholds

```
tap slop            10 dp movement before it stops being a tap
long-press          400–500 ms
swipe commit        > 40% of the row width, OR velocity > 800 dp/s
sheet dismiss       > 30% of sheet height, OR downward velocity > 500 dp/s
pull-to-refresh     ~80 dp with resistance past it
edge zone           ~20 dp — keep custom gestures out
```

## 6. Feedback during gestures

- Long-press: haptic **at the moment the threshold is crossed**, so the user learns the timing.
- Swipe row: action background grows behind the row; the icon scales slightly as the commit threshold is crossed; light haptic at the threshold.
- Sheet drag: haptic on snapping to a detent.
- Reorder: lift the row (scale + shadow), haptic on pick-up and on drop.
- Pull-to-refresh: indicator rotation tracks pull distance; haptic when the trigger threshold is reached.

-> `haptics.md`

## 7. Destructive swipes

- Destructive action is the **far** action, in `status.error`, with an icon *and* a label.
- Prefer full-swipe-to-commit **only** when undo exists. Otherwise require a tap on the revealed button.
- Show an undo snackbar for 5–7 seconds after a destructive swipe; perform the real deletion when it expires.
- Never make an irreversible money action (send, withdraw, close account) a swipe with no confirmation.

## 8. Accessibility

- Every gesture-only action needs an `accessibilityAction` so screen-reader users can reach it via the actions rotor.
- Announce the result of a gesture (`AccessibilityInfo.announceForAccessibility`).
- Increase effective touch areas with `hitSlop`; users with motor impairments cannot hit a 20 dp handle.
- Reduce Motion: keep the gesture, simplify the accompanying animation.
- Never require multi-finger or precise-path gestures for anything essential.

## 9. Testing

- [ ] Horizontal swipes do not block vertical scroll (and vice versa)
- [ ] Nested scroll (carousel inside a list) works both directions
- [ ] Sheet drag + inner scroll cooperate
- [ ] Custom gestures do not collide with system edges on either platform
- [ ] Every gesture has a visible alternative
- [ ] Slow-drag and fast-flick both behave sensibly
- [ ] Interrupting a gesture mid-flight does not leave a stuck state
