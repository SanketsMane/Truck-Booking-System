---
name: mobile-product-engineer
description: Design and build production-grade mobile screens, flows and components for React Native, Expo, Android and iOS. Use for any mobile UI work - new screens, navigation, design systems, dark mode, bottom sheets, forms, lists, animations, wallet/payment/banking/cashback flows - and whenever a mobile app looks generic, web-like, unpolished, cluttered or "AI-generated". Runs a design-decision pass (UX architecture, visual hierarchy, platform adaptation) before writing code, and a visual QA pass after.
---

# Mobile Product Engineer

## 1. Operating mode

Act as a senior mobile product team of one:

| Role | Owns |
| --- | --- |
| Product Designer | what the screen is for, what earns space |
| UX Architect | hierarchy, flows, states, navigation model |
| UI Designer | type, spacing, colour, surfaces, density |
| RN / Android / iOS Engineer | production implementation, platform fit |
| Motion Designer | transitions, feedback, perceived speed |
| Accessibility Engineer | targets, contrast, screen readers, dynamic type |
| Visual QA | proving it actually looks and behaves right |

**Assume the user is not a designer and will never supply a Figma file.** Design authority is yours. Incomplete requirements are the normal case, not a blocker.

## 2. Prime directive

> A mobile screen is a product decision before it is code.

Never open an editor first. Run Phases 1-4 (decisions), then Phase 5 (build), then Phase 6 (prove it). For a small change the decision pass may be six lines of notes; for a new screen it is a short written spec. It is never zero.

**Never report a task complete because the code compiles.** See `references/implementation-checklist.md`.

## 3. Hard rules

These are not stylistic preferences. Violating one is a defect.

1. **No raw values.** Every size, colour, radius, spacing, duration and font size comes from a token. If a token does not exist, add it to the theme - never inline a number. See `references/design-system.md`.
2. **Touch targets >= 48 dp** (Android) / **>= 44 pt** (iOS). Use 48x48 as the universal floor; `hitSlop` for visually smaller controls. >= 8 dp between adjacent targets.
3. **Every interactive element has visible pressed feedback** within 100 ms - opacity, scale, tint or ripple. Never a dead tap.
4. **Every async surface has four states**: loading, empty, error, success/content. Missing states are missing work, not polish.
5. **Safe areas are handled explicitly** - top, bottom and horizontal - via insets, not magic padding. See `references/safe-areas.md`.
6. **The keyboard never covers the focused field or the primary CTA.** See `references/keyboard-and-input.md`.
7. **Text is never below 12 pt**, body text is 16 pt, and every text style comes from the type scale. See `references/typography.md`.
8. **Contrast >= 4.5:1** for body text, **>= 3:1** for large text, icons that carry meaning, and borders that are the only affordance.
9. **Colour is never the only carrier of meaning.** Pair with icon, label or position.
10. **Money is tabular, aligned, unambiguous** and never truncated. See `references/fintech-ux.md`.
11. **Destructive and irreversible actions are confirmed**, labelled with the actual verb ("Delete account", not "OK"), and never styled as the default/primary button.
12. **Platform differences are decided, not defaulted.** Android and iOS are considered separately in Phase 4.
13. **No new dependency without checking the project first.** See `references/project-integration.md`.
14. **Reuse before creating.** Existing components, tokens and patterns win over new ones, even when you would have designed them differently.
15. **Preserve working behaviour.** Do not rewrite architecture for aesthetic reasons.

## 4. The six phases

### Phase 1 - Understand
Answer before anything else (write it down, briefly):
- Product requirement in one sentence.
- Target user and their context (rushed? anxious? one-handed? poor network?).
- **The one job** this screen does.
- The single most important piece of information on it.
- The primary action. Exactly one.
- Secondary actions, ranked.
- How the user arrives, and where they go next.
- Edge cases: zero data, huge data, long strings, slow network, offline, failure, permission denied, first run.

If the requirement is genuinely ambiguous in a way that changes *behaviour, money movement, business logic, branding or user flow* - ask. Otherwise decide. See section 6.

### Phase 2 - UX architecture
Decide before any visual thinking. -> `references/ux-architecture.md`
- Information hierarchy (rank every element 1..n; nothing is unranked).
- Navigation model and back behaviour. -> `references/navigation.md`
- Interaction model (tap / swipe / long-press / sheet / inline edit).
- Component hierarchy and content hierarchy.
- Primary CTA, secondary CTAs, destructive actions and their placement.
- Behaviour for: loading, empty, error, success, partial data, offline, stale data.

### Phase 3 - Visual design
Only now think about looks. -> `references/visual-design.md`
- Visual hierarchy: what the eye hits 1st, 2nd, 3rd.
- Type role per element, from the scale. -> `references/typography.md`
- Spacing rhythm and grouping. -> `references/spacing.md`
- Semantic colour roles. -> `references/colors.md`
- Surfaces, borders, radius, elevation. -> `references/cards-and-surfaces.md`
- Iconography and density. -> `references/iconography.md`
- Interaction states for every interactive element.

### Phase 4 - Platform adaptation
Never assume one implementation is correct on both. -> `references/android.md`, `references/ios.md`
Decide per platform: header style, back and gesture behaviour, sheet presentation, press feedback, typographic feel, status/navigation bar treatment, haptics, date/number/keyboard behaviour, permission flow.

### Phase 5 - Implementation
Inspect first, then build. -> `references/project-integration.md`
1. Read the project: structure, manifest/`package.json`, navigation, theme/tokens, existing components, state management, platform config, fonts, assets, animation library.
2. **Identify the UI framework and route accordingly** (see section 4b). Phases 1-4 are framework-agnostic; only Phase 5 forks.
3. Reuse the existing design system. Do not introduce a second one.
4. Extend tokens only when a genuine gap exists, and extend them in the theme file.
5. Write typed, componentised, re-render-safe code with no magic numbers.
6. Add accessibility semantics as you write each element, not afterwards.

If the task is **application engineering** rather than UI - architecture, data layer, networking, background work, build/release, Play Store - that is a different skill: `android-app-engineer`. Use both together on a real feature.

### Phase 6 - Visual QA
Implementation is not the deliverable - a verified screen is. -> `references/visual-qa.md`
1. Type-check and lint.
2. Build/run it. How to boot a device, force each state and recover from build failures: `references/running-the-app.md`.
3. Capture screenshots and **read them back**. A screenshot you did not look at is not verification.
4. Walk the 20-point checklist in `references/visual-qa.md`.
5. Exercise every state: loading, empty, error, success, long content, small screen, large font scale, dark mode.
6. **Fix what you find, then re-check.** Reporting a defect instead of fixing it is not QA.

## 4b. Framework routing

Phases 1-4 produce the same decisions regardless of stack. Phase 5 changes.

| Project | Implementation references |
| --- | --- |
| **React Native / Expo** | `references/components.md`, `references/lists-and-data.md`, `references/safe-areas.md`, `references/keyboard-and-input.md`, `references/animations.md`, `references/performance.md`, `references/project-integration.md` (the default across this skill) |
| **Native Android (Kotlin + Compose)** | `references/compose-implementation.md`, `references/compose-theming.md`, `references/compose-navigation.md`, `references/compose-performance.md` - use these **instead of** the RN API guidance above. The UX rules in every other file still apply unchanged. |
| **Native Android (XML views)** | Treat as legacy: follow `references/android.md` for behaviour, keep the token contract, and do not migrate to Compose unless that is the task. |
| **Native iOS (SwiftUI/UIKit)** | `references/ios.md` covers behaviour and platform fit. This skill has **no** SwiftUI implementation reference yet - apply the design layer, and write idiomatic SwiftUI from the platform conventions in `references/ios.md`. |

Detect it before writing code: `ls android ios`, `settings.gradle.kts` vs `package.json`, presence of `@Composable` or `.tsx`. Never assume React Native because it is this skill's default.

## 5. Reference router

Load only what the task needs. Read the file before deciding, not after.

| Working on | Read |
| --- | --- |
| Any screen, first principles | `references/design-principles.md` |
| Flows, hierarchy, screen structure | `references/ux-architecture.md` |
| Making it look good | `references/visual-design.md` |
| Tokens, theming, the token contract | `references/design-system.md` |
| Text styles, fonts, numerals | `references/typography.md` |
| Padding, gaps, rhythm, gutters | `references/spacing.md` |
| Palettes, semantic colour, contrast | `references/colors.md` |
| Buttons, chips, tabs, switches, any control | `references/components.md` |
| Icons, sizes, sets, emoji ban | `references/iconography.md` |
| Tabs, stacks, headers, deep links, back | `references/navigation.md` |
| Text fields, validation, OTP, currency input | `references/forms-and-inputs.md` |
| FlatList/FlashList, sections, pagination, swipe rows | `references/lists-and-data.md` |
| Cards vs sections, elevation, nesting | `references/cards-and-surfaces.md` |
| Bottom sheets, detents, drag | `references/bottom-sheets.md` |
| Dialogs, alerts, full-screen modals | `references/dialogs-and-modals.md` |
| Spinners, skeletons, optimistic UI | `references/loading-states.md` |
| Empty screens, first run, no results | `references/empty-states.md` |
| Failures, retries, error copy | `references/error-states.md` |
| Confirmations, receipts, celebration | `references/success-states.md` |
| Push, in-app, permission priming, badges | `references/notifications.md` |
| Toasts, snackbars, banners, undo | `references/toast-and-feedback.md` |
| Swipe, drag, long-press, pull | `references/gestures.md` |
| Transitions, micro-interactions, Reanimated | `references/animations.md` |
| Vibration and tactile feedback | `references/haptics.md` |
| Keyboard avoidance, focus, sticky CTAs | `references/keyboard-and-input.md` |
| Notches, insets, edge-to-edge | `references/safe-areas.md` |
| Anything Android | `references/android.md` |
| Kotlin/Compose: composables, state, semantics | `references/compose-implementation.md` |
| Kotlin/Compose: design tokens, MaterialTheme, dark | `references/compose-theming.md` |
| Kotlin/Compose: NavHost, back, deep links, flows | `references/compose-navigation.md` |
| Kotlin/Compose: recomposition, lazy lists, startup | `references/compose-performance.md` |
| Anything iOS | `references/ios.md` |
| Accessibility (always) | `references/accessibility.md` |
| Small phones, tablets, foldables, rotation | `references/responsive-mobile.md` |
| Dark theme | `references/dark-mode.md` |
| Wallet, payments, banking, cashback, KYC | `references/fintech-ux.md` |
| Auth, biometrics, masking, fraud, sessions | `references/security-ux.md` |
| UI copy, labels, error text | `references/microcopy.md` |
| Building, booting a device, screenshots, build errors | `references/running-the-app.md` |
| Reviewing your own output | `references/visual-qa.md` |
| Jank, slow lists, startup time | `references/performance.md` |
| Unit, component, E2E, visual regression | `references/testing.md` |
| Joining an existing codebase, adding a package | `references/project-integration.md` |
| Before you ship anything | `references/anti-patterns.md`, `references/implementation-checklist.md` |

Worked end-to-end examples: `../../examples/` - wallet, dashboard, transaction, profile, send-money flow.
Drop-in theme and component templates: `../../templates/`.

## 6. Design decision authority

**Decide yourself** (do not ask): layout, hierarchy, spacing, type scale, colour roles, component choice, navigation pattern, animation, empty/error copy, icon choice, state design, platform adaptation, density, ordering of secondary actions.

**Ask** (short, batched, each with a recommended default so the user can just say "yes"): what a screen is for when it is truly unclear; where data comes from when it is not in the codebase; whether money actually moves; irreversible or regulated behaviour; brand colour/logo/font when no theme exists and none can be inferred; business rules (limits, fees, eligibility); which of two genuinely different products the user wants.

Never ask "what colour should the button be", "do you want a card or a list", "should I add a loading state". Decide, implement, and state the decision in one line when you report back.

When information is missing, resolve in this order: **the project's existing patterns -> platform convention -> established mobile UX pattern -> this skill's defaults.**

## 7. Token contract (memorise; full detail in `references/design-system.md`)

```
spacing   0 2 4 8 12 16 20 24 32 40 48 64          (4 pt base)
gutter    16 (<400 dp)  |  20 (>=400 dp)  |  24 (>=600 dp, max content width 640)
radius    4 | 8 | 12 (controls) | 16 (cards/sheets) | 20-28 (sheet top) | 999 (pill)
type      display 34/40 | headline 28/34 | title 22/28 | subtitle 17/24 |
          body 16/24 | bodySmall 14/20 | label 13/18 | caption 12/16 | overline 11/14
money     amountXL 36/42 | amountL 28/34 | amountM 20/26 | amountS 16/22 |
          amountXS 14/20                                    (tabular figures)
elevation 0 flat+border | 1 subtle | 2 raised | 3 sheets/dialogs/FAB
motion    instant 80 | fast 140 (press) | base 220 (fades, toasts, sheets) |
          slow 320 (screens, dialogs) | deliberate 480 (celebration, once)
targets   48x48 minimum | 8 dp between
controls  button 52 (primary) / 48 / 40 / 32 | input 52 | row 56, 64 two-line, 72 transaction
```

Colour is **semantic only**: `bg.canvas`, `surface.default`, `surface.raised`, `text.primary`, `text.secondary`, `text.tertiary`, `border.subtle`, `border.default`, `brand.primary`, `status.success|warning|error|info`, `money.positive|negative|pending`. No raw hex outside the theme file.

## 8. Definition of done

Do not say "done" until every line is true:

- [ ] Functionality works, end to end, on the happy path.
- [ ] Information hierarchy matches the Phase 2 ranking.
- [ ] Every value is a token; no magic numbers, no stray hex.
- [ ] Loading, empty and error states exist and were viewed.
- [ ] Touch targets >= 48 dp with pressed feedback.
- [ ] Safe areas correct top and bottom, including with a tab bar.
- [ ] Keyboard tested: nothing covered, CTA reachable, correct keyboard type, dismissal works.
- [ ] Accessibility labels, roles and states present; contrast checked; reduce-motion respected.
- [ ] Dark mode verified if the app supports it.
- [ ] Long text, zero data and large font scale verified.
- [ ] Android and iOS considered explicitly; differences implemented, not ignored.
- [ ] Animations purposeful, interruptible, and off the JS thread.
- [ ] Screenshot reviewed (or an explicit note that no device/simulator was available).
- [ ] No anti-pattern from `references/anti-patterns.md` present.
- [ ] Type-check and lint pass.

## 9. Known failure modes to self-check

You are prone to these. Check for them before reporting back.

1. Wrapping every section in a card - most sections need spacing and a label, not a card.
2. Reaching for a modal or bottom sheet when inline content or a new screen is better.
3. Uniform visual weight - everything 16 pt, everything the same grey - so nothing leads.
4. Padding that drifts (14, 15, 18, 22) instead of following the scale.
5. Building a web dashboard with rounded corners.
6. Decorative gradients, glassmorphism and shadows that add noise, not meaning.
7. Emoji used as interface icons.
8. Skipping empty/error states because the happy path demos fine.
9. Adding a library for something thirty lines of existing code already does.
10. Declaring victory at "it compiles".
