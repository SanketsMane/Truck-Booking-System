# Animation and motion

Motion explains state change. If an animation does not answer "what just happened?" or "where did this come from?", delete it.

## 1. Purpose test

Every animation must do one of:

| Purpose | Example |
| --- | --- |
| Explain a spatial relationship | Sheet rises from the button that opened it |
| Confirm an action | Button press-in, toggle slide, checkmark draw |
| Maintain continuity | Shared element from list row to detail header |
| Mask latency | Skeleton shimmer, optimistic row insert |
| Direct attention | Error field shake, balance count-up on change |

If it does none of these, it is decoration. Decoration ages badly, costs frames, and makes an app feel slower.

## 2. Duration and easing

```
instant     80    micro-adjustments, colour-only changes
fast       140    press feedback, switches, checkboxes
base       220    fades, tooltips, inline expand, toasts, bottom sheets
slow       320    screen transitions, dialogs
deliberate 480    success celebration — once, never in a loop
pulse      900    skeleton shimmer half-cycle
```

Use the token, not a nearby number. Durations live in the theme
(`design-system.md` §7); a raw `250` in a component is a defect.

| Motion | Easing |
| --- | --- |
| Entering | decelerate (`easeOut`) — fast in, settle |
| Exiting | accelerate (`easeIn`) — leave briskly |
| Both (move/resize) | standard (`easeInOut`) |
| Gesture-driven, interactive | spring |

Springs: prefer `damping` 15–20, `stiffness` 150–250, `mass` 1 for UI. Never a bouncy spring on a financial confirmation — bounce reads as playful, and playful reduces trust. -> `fintech-ux.md`

Larger elements travel further and may take slightly longer. Small elements animating for 400 ms feel broken.

## 3. Implementation rules

1. **Run on the UI thread.** `react-native-reanimated` worklets, or `useNativeDriver: true` with `Animated`. A JS-thread animation stutters the moment a list renders.
2. Animate `transform` and `opacity`. Animating `width`, `height`, `top`, `margin` or shadow triggers layout on every frame.
3. **Interruptible.** A user who taps again mid-animation must not wait. Springs and Reanimated's `withSpring` handle this naturally; chained timing callbacks do not.
4. Cancel and clean up animations on unmount.
5. No animation blocks input. Never gate a tap behind a 400 ms sequence.
6. `LayoutAnimation` is fine for simple list changes on iOS but is unreliable on Android — prefer Reanimated `Layout`/`entering`/`exiting`.

## 4. Screen transitions

- Push/pop: platform default (iOS slide from right with edge-swipe; Android fade-through / shared axis). Do not override without reason.
- Modal: slide up from bottom.
- Tab switch: no transition, or a fast cross-fade. Sliding between tabs implies spatial adjacency that tabs do not have.
- Flow steps (step 1 → 2 → 3): forward slides left, back slides right. Consistent direction builds a mental model.
- Keep the header stable across a flow so only the content moves.

## 5. Bottom sheets

- Rise with a decelerating curve, 220–280 ms, backdrop fading in simultaneously.
- Drag tracks the finger 1:1. Release velocity decides snap — never snap purely on position.
- Rubber-band resistance past the top detent.
- Dismiss animation matches the drag direction. -> `bottom-sheets.md`

## 6. Lists

- Stagger entry only on first load, ≤5 items, ≤30 ms apart. Staggering 50 rows is a slideshow.
- Insert/remove: fade + height, ≤200 ms.
- Swipe actions track the finger; snap open/closed on release velocity.
- **No entrance animation on scroll** for long lists — it makes scrolling feel laggy and fights recycling.
- Pull-to-refresh: platform spinner, or a custom indicator that tracks pull distance and only triggers past the threshold. -> `lists-and-data.md`

## 7. Loading and progress

- Skeletons for content whose shape is known; shimmer sweep 1000–1500 ms, low contrast. -> `loading-states.md`
- Spinner only after ~300 ms of waiting; showing one instantly for a 100 ms request makes the app feel slower.
- Determinate progress whenever a real percentage exists. Never fake progress on a payment.
- Button loading state: swap the label for a spinner **in place**, keeping the button's width fixed so the layout does not jump.

## 8. Success and error

- **Success**: a check that draws in 300–400 ms, optional scale-in, success haptic. One moment, then move on. No confetti on routine transactions; reserve celebration for genuine milestones. -> `success-states.md`
- **Error**: a short horizontal shake (2 oscillations, ~300 ms total, ≤8 dp) on the offending field, error haptic, plus the message. Shake alone is not an error message.
- Money value changes: count up over ~400 ms with tabular figures so the digits do not jitter. Only when the change is meaningful and user-initiated.

## 9. Micro-interactions

| Element | Feedback |
| --- | --- |
| Button | scale 0.97 + opacity 0.9, 120 ms; Android ripple |
| Card / row | background tint or ripple |
| Toggle | thumb slide + track colour, 160 ms |
| Checkbox | box fill + tick draw, 160 ms |
| Tab | indicator slides to the new tab, 200 ms |
| Chip select | fill + border change, 120 ms |
| FAB | scale-in on mount, rotate on state change |
| Icon button | scale + borderless ripple |

Press feedback must begin on `pressIn`, not on release. -> `components.md`

## 10. Reduced motion

Non-negotiable.

```tsx
const reduceMotion = useReducedMotion(); // reanimated, or AccessibilityInfo
```

- Replace slides, scales and parallax with cross-fades (or no transition).
- Stop looping/pulsing animations; keep a static indicator.
- Keep essential state-change feedback — reduced motion means *less movement*, not *no feedback*.
- Never remove the only signal that something happened.

## 11. Anti-patterns

- Animating on every scroll frame (parallax headers that jank)
- Bounce/elastic on financial confirmations
- Looping "attention" animations that never stop
- Blocking input during a transition
- Animating layout properties instead of transforms
- Staggering long lists
- Confetti on every transaction
- Splash animations that add seconds to launch
- Animation as a substitute for actual copy

## 12. QA

- [ ] 60 fps on a low-end Android device (enable the FPS overlay)
- [ ] Every animation interruptible
- [ ] Reduce Motion honoured
- [ ] No layout jump when a state swaps (button → spinner)
- [ ] Durations from the token scale, not arbitrary
- [ ] Nothing loops forever
