# Implementation checklist

The gate between "I wrote code" and "this is done". Walk it literally. Anything you cannot tick is remaining work, not a caveat.

## 0. Before you write anything

- [ ] Phase 1–4 decisions made and written down (even six lines)
- [ ] Project inspected: tokens, components, navigation, state, styling approach -> `project-integration.md`
- [ ] One existing screen read in full, so the new work matches its conventions
- [ ] Reuse ladder applied — no new component that duplicates an existing one
- [ ] No new dependency, or one justified in a sentence

## 1. Structure and hierarchy

- [ ] The screen has **one** job, and one obvious focal point
- [ ] Elements ranked 1..n in Phase 2; the visual weight matches that ranking
- [ ] Exactly one primary action, visually dominant
- [ ] Secondary actions clearly subordinate; tertiary actions are links or a menu
- [ ] Destructive actions separated from frequently-tapped controls, never styled as primary
- [ ] No card that should be a section with a label -> `cards-and-surfaces.md`
- [ ] Nesting depth ≤ 2 levels of surface elevation

## 2. Design system compliance

- [ ] Every spacing value from the 4 pt scale
- [ ] Every radius from the radius set; consistent within a component family
- [ ] Every text style from the type scale — no stray sizes
- [ ] Every colour a semantic token; **zero** raw hex outside the theme file
- [ ] Elevation from the defined levels, not ad-hoc shadow objects
- [ ] Animation durations from the motion tokens
- [ ] Any new token added to the theme file, in the project's naming style, with light **and** dark values

## 3. Typography

- [ ] Body 16, nothing below 12
- [ ] Explicit `lineHeight` on every style
- [ ] ≤ 3 sizes and ≤ 2 weights in most view areas
- [ ] Money and numeric columns use tabular figures
- [ ] Amounts never truncated; long names wrap or scale
- [ ] Sentence case; no ALL CAPS body text

## 4. States (all four, always)

- [ ] **Loading**: skeleton matching the real layout; no layout shift on arrival; no spinner for sub-300 ms; no false zero
- [ ] **Empty**: explains why, offers exactly one action; "no data" and "no results for this filter" handled separately
- [ ] **Error**: says what happened and what to do next; retry works; financial errors state whether money moved
- [ ] **Success/content**: the real thing, with realistic data
- [ ] Partial failure degrades gracefully (one failed section does not blank the screen)
- [ ] Offline behaviour decided and implemented where relevant

## 5. Interaction

- [ ] Every interactive element ≥ 48×48 dp, with ≥ 8 dp separation
- [ ] Visible pressed feedback within 100 ms on every tappable — ripple on Android, opacity/scale on iOS
- [ ] Disabled states explain the blocker, or the control stays enabled and validates on tap
- [ ] Loading state on the submitting button, with fixed width so nothing jumps
- [ ] Double-submission impossible on any action that costs money
- [ ] Every gesture has a visible alternative -> `gestures.md`
- [ ] Haptics meaningful and sparing -> `haptics.md`

## 6. Forms and keyboard

- [ ] Visible labels, not placeholder-only
- [ ] Correct `keyboardType`, `textContentType`/`autoComplete`, `autoCapitalize` per field
- [ ] Focus chains through fields; last field submits
- [ ] Focused field never covered; CTA reachable while typing
- [ ] `keyboardShouldPersistTaps="handled"` so buttons work on the first tap
- [ ] Keyboard dismissible by tap-outside or scroll
- [ ] Validation on blur/submit, not per keystroke; errors adjacent to their field
- [ ] OTP autofills and auto-submits -> `keyboard-and-input.md`

## 7. Platform

- [ ] Android and iOS differences **decided**, not defaulted
- [ ] Safe areas from insets, top and bottom, with `max()` floors on pinned elements
- [ ] Android: edge-to-edge, ripple, predictive back, both navigation modes -> `android.md`
- [ ] iOS: swipe-back intact or deliberately disabled with a close affordance; sheet detents correct -> `ios.md`
- [ ] Back never dead-ends; sheets and modals consume back on Android
- [ ] No hardcoded device dimensions or inset values
- [ ] Cold start does not flash the wrong theme

## 8. Accessibility

- [ ] Label + role on every interactive element; icon-only buttons labelled
- [ ] Rows grouped into single, sensibly-ordered nodes
- [ ] `accessibilityState` reflects live state
- [ ] Contrast passes in light **and** dark, including placeholders and disabled text
- [ ] Font scale 2.0× reflows without clipping or overlap
- [ ] Colour never the only carrier of meaning (greyscale test passes)
- [ ] Reduce Motion honoured
- [ ] Modals move focus in and restore it out
- [ ] Async results announced
- [ ] Screen-reader pass done on both platforms -> `accessibility.md`

## 9. Responsive and data

- [ ] 320 dp and 360×640 verified; largest supported device verified
- [ ] Tablet: content capped or two-pane, never stretched
- [ ] Longest realistic strings, largest realistic amounts, missing optional fields all verified
- [ ] 0 / 1 / many items all look correct
- [ ] Long lists virtualised -> `lists-and-data.md`

## 10. Motion

- [ ] Every animation serves a purpose from the purpose test
- [ ] Runs on the UI thread; transforms and opacity only
- [ ] Interruptible; no blocked input
- [ ] Durations from the scale; nothing loops forever
- [ ] No bounce on financial confirmations -> `animations.md`

## 11. Fintech (when applicable)

- [ ] Amounts: tabular, locale-correct grouping, 2 decimals, currency shown, never truncated
- [ ] Available vs pending balance distinguished and labelled
- [ ] Every transaction row answers who/what/how much/when/status
- [ ] Status = icon + word + colour
- [ ] Review screen before every irreversible action, showing the total including fees
- [ ] Result screen unambiguous, with a copyable reference ID; back goes home
- [ ] Sensitive values masked; no secrets in logs or analytics -> `fintech-ux.md`, `security-ux.md`

## 12. Code quality

- [ ] TypeScript, properly typed — no `any` on props or API shapes
- [ ] Component under ~200 lines; extracted sub-components where it grew
- [ ] Styles in `StyleSheet.create` at module scope; no inline objects in hot paths
- [ ] No magic numbers, no duplicated style blocks, no copy-pasted logic
- [ ] `keyExtractor` stable; `renderItem` memoised and module-level
- [ ] Listeners, timers and subscriptions cleaned up on unmount
- [ ] `useWindowDimensions`, not `Dimensions.get` at module scope
- [ ] Matches the project's existing conventions

## 13. Verification

- [ ] Type-check passes
- [ ] Lint passes
- [ ] Tests pass; new logic (especially money maths) is tested -> `testing.md`
- [ ] App built/run if the project can run
- [ ] Screenshots captured **and looked at**
- [ ] The 20-point visual QA pass walked -> `visual-qa.md`
- [ ] Dark mode viewed
- [ ] Every anti-pattern checked against -> `anti-patterns.md`
- [ ] Defects found during QA were **fixed**, then re-checked

## 14. Reporting

State plainly:
- What you built, and the key design decisions in one line each
- What you reused from the project
- What you added to the theme, and any dependency added
- **What you verified, and on what** (device, theme, states)
- **What you could not verify**, and why
- Anything you deliberately left out, and why

Never say "done" while a box above is unticked. If something is blocked, finish everything else and say exactly what remains.
