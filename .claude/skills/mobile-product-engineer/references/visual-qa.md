# Visual QA

Implementation is not the deliverable. A **verified** screen is. This pass is mandatory, and its output is fixes — not a list of observations.

> If you find a defect, fix it and re-check. Reporting a defect you could have fixed is not QA.

## 1. Get eyes on it

In order of preference:

1. **Run it and screenshot it.** Then *actually look at the image*.
   - Expo: `npx expo start`, then open on a simulator/emulator or device.
   - iOS: `xcrun simctl list devices`, `xcrun simctl boot <udid>`, `xcrun simctl io booted screenshot out.png`
   - Android: `adb devices`, `adb exec-out screencap -p > out.png`
   - Read the PNG back and inspect it. A screenshot you did not look at proves nothing.
2. **Storybook / component preview**, if the project has one.
3. **Static review** against this checklist, reading your own code as a reviewer would.

If no device or simulator is available, say so explicitly in your report. Never imply visual verification you did not perform.

Capture, at minimum: default state, loading, empty, error, dark mode, and the largest font scale.

## 2. The 20-point pass

### 1. Composition
Does the screen have one obvious focal point? Squint at the screenshot — the most important element should still dominate. If everything is equally loud, the hierarchy failed.

### 2. Information hierarchy
Does the visual ranking match the Phase 2 ranking? The most important information must be the largest, highest-contrast, or highest on screen. The primary action must be unmistakable.

### 3. Typography
- Every style from the scale — no stray 15 or 17 pt values.
- ≤ 3 sizes in most view areas; ≤ 2 weights per block.
- Line height set explicitly; body ~1.5×.
- Nothing below 12 pt.
- Money uses tabular figures and lines up. -> `typography.md`

### 4. Spacing
- Every gap from the 4 pt scale. Look for 14, 18, 22 — they are always accidents.
- Consistent horizontal gutter down the whole screen.
- Related items closer together than unrelated ones (proximity communicates grouping).
- Consistent section rhythm; no random large gaps. -> `spacing.md`

### 5. Alignment
- One left edge for text content. Overlay the screenshot with a vertical line if unsure.
- Amounts right-aligned and consistent.
- Icons optically centred with their labels (optical, not mathematical).
- No 1–3 px drift between rows.

### 6. Component consistency
Same component, same look everywhere. Compare against other screens in the app, not just this one. Every button of the same rank has the same height, radius, padding and type.

### 7. Colour
- No raw hex outside the theme file — grep for `#` in the screen's source.
- Semantic tokens used for their actual meaning (`status.error` for errors, not for a brand accent).
- ≤ 2 accent colours per screen.
- Money colours consistent with the rest of the app. -> `colors.md`

### 8. Contrast
Body ≥ 4.5:1, large text and meaningful icons ≥ 3:1. Check placeholders, disabled text, secondary text on tinted surfaces, and borders that are the only affordance. Check in **both** themes. -> `accessibility.md`

### 9. Touch targets
Every tappable ≥ 48×48 dp with ≥ 8 dp separation. Small glyphs need `hitSlop`. Check chevrons, close buttons, chips, tab bar items, inline links. Press each one on a device — thumbs are less precise than a mouse.

### 10. Safe areas
Top and bottom, on a notched device, an SE-class device, Android gesture nav and Android 3-button nav. Nothing under the clock or the home indicator. No double padding. Last list item fully reachable. -> `safe-areas.md`

### 11. Keyboard
Open the keyboard on every screen that has an input. The focused field visible, the CTA reachable, correct keyboard type per field, dismissal works, no content permanently hidden, no layout jump. -> `keyboard-and-input.md`

### 12. Navigation
Title correct, back works (including hardware/gesture back on Android), the flow is escapable, deep-link entry lands on a screen with a sensible back stack, tab state preserved, no dead ends. -> `navigation.md`

### 13. Loading states
Trigger them (throttle the network). Skeletons match the real content's shape. No layout shift when data arrives. No spinner for sub-300 ms waits. No false zero values while loading. -> `loading-states.md`

### 14. Empty states
Force zero data. Explains why it's empty, offers one action, does not look like a broken screen. Also check "filtered to nothing" separately from "nothing at all". -> `empty-states.md`

### 15. Error states
Force a failure (airplane mode, a bad endpoint). Message says what happened and what to do next. Retry exists and works. Partial failures degrade gracefully. Financial errors state whether money moved. -> `error-states.md`

### 16. Animation
60 fps on a low-end device. Purposeful, interruptible, correct durations, no layout jump on state swap, Reduce Motion honoured. -> `animations.md`

### 17. Android behaviour
Edge-to-edge, ripple feedback, predictive back, both navigation modes, font scale, cold-start theme, rotation/recreation. -> `android.md`

### 18. iOS behaviour
Safe areas across device classes, swipe-back, sheet detents and dismissal, Dynamic Type, haptics, large-title decision. -> `ios.md`

### 19. Accessibility
Screen-reader pass on both platforms: order, labels, roles, states. Greyscale test. Font scale 2.0×. Focus handling in modals. -> `accessibility.md`

### 20. Performance
Scroll a long list — no blank frames or stutter. No re-render storms. Images sized and cached. Screen transition feels immediate. -> `performance.md`

## 3. Squint test

Blur the screenshot (or genuinely squint at it) and answer:

- What is the screen about? (Should be obvious from the largest element.)
- What is the primary action? (Should be the strongest colour block.)
- Where does the eye go 1st, 2nd, 3rd? (Should match your Phase 2 ranking.)
- Does anything unimportant shout? (A decorative element competing with content is a defect.)

If the answers are wrong, the problem is hierarchy — not spacing, and not colour.

## 4. Data stress test

Re-check with hostile but realistic data:

- [ ] Longest realistic name / merchant / address
- [ ] Largest realistic amount
- [ ] Zero items, one item, 500 items
- [ ] Missing optional fields (null avatar, no note, no category)
- [ ] Very long error message
- [ ] Slowest realistic network
- [ ] Offline
- [ ] Every status value the API can return

## 5. Cross-screen consistency

Open the new screen next to two existing screens and compare: gutter, header treatment, row height, button style, section header style, empty-state style, back behaviour. A screen that is beautiful but inconsistent with its neighbours has made the app worse.

## 6. Self-review prompts

Ask yourself, honestly:

1. Would a senior designer ship this, or ask for another pass?
2. What is the single ugliest thing on this screen? (There is always one. Fix it.)
3. What did I skip because it was tedious? (Usually: empty state, dark mode, font scale.)
4. Is there a card here that should just be a section with a label?
5. Is anything on this screen decoration rather than information?
6. Which anti-pattern from `anti-patterns.md` is present right now?

## 7. Output format

When reporting back, be specific and honest:

```
Verified on: iPhone 15 simulator (light + dark), Pixel 7 emulator (gesture + 3-button)
States checked: default, loading, empty, error, font scale 2.0×
Fixed during QA:
  - Amount column was proportional-figure; switched to tabular
  - Bottom CTA ignored insets.bottom on SE (added max(insets.bottom, 16))
  - Empty state had no action; added "Send money"
Not verified: physical device haptics (no hardware available)
```

Never write "looks good" without saying what you looked at.
