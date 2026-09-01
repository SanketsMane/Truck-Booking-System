# Anti-patterns

These are the specific failures that make an app look AI-generated, unfinished or web-ported. Scan for them before reporting any screen complete.

## 1. Layout and structure

**Everything inside a card.** The most recognisable AI-UI tell. A card means "this is a discrete object, separable from its neighbours". A settings group, a page section or a form is not a card. → Use a section label, spacing and a divider. Reserve cards for genuinely object-like content (a transaction, an offer, an account).

**Nested cards.** A card inside a card inside a card. Two levels of elevation is the maximum; three is a hierarchy failure. → Flatten. The inner content becomes rows.

**Giant rounded containers.** A 24 px radius wrapped around a full-width block that touches both gutters. At full width, a large radius just looks like a mistake. → Full-bleed sections get 0 radius; inset cards get 12–16.

**Web dashboard in a phone frame.** Stat tiles in a 2×2 grid, a data table, a sidebar, a filter bar across the top. → Mobile shows one primary number and a list. Tables become rows. Sidebars become tabs or a sheet.

**Huge hero section.** 40% of the viewport on a decorative header before any content. → The hero is the *content* (the balance, the status). Decoration earns no space above the fold.

**Excessive whitespace copied from web.** 48–64 px between every section because it looked good on a 1440 px canvas. → Mobile section spacing is 24–32. Density is a feature on a phone.

**Cramped, uniform density.** The opposite failure: everything 8 px apart with no grouping. → Proximity must communicate structure.

**Content centred vertically on a tall screen** with the CTA floating in the middle. → Anchor content to the top, actions to the bottom.

## 2. Typography

**Random font sizes.** 15, 17, 19, 22 appearing because each was eyeballed. → Every size from the scale.

**Everything the same size.** All 16 pt, all `text.primary`. Nothing leads. → At least a 1.5× ratio between the hero and body.

**Tiny text.** 10–11 pt body text or labels because "it looks cleaner". → 12 pt floor, 16 pt body.

**Proportional figures on money.** Amounts that shift width as digits change. → `fontVariant: ['tabular-nums']`.

**Truncated amounts or names in a confirmation.** → Wrap, or scale the type down. Never `…` on money.

**ALL CAPS body text or Title Case Buttons.** → Sentence case.

**No explicit line height.** Defaults differ between Android and iOS, so the screen looks right on one and cramped on the other.

## 3. Colour and surfaces

**Raw hex scattered through components.** → Semantic tokens only; hex lives in one theme file.

**Gradients everywhere.** A gradient background, a gradient card, a gradient button, gradient text. → At most one gradient per screen, on a genuinely hero surface. Fintech: prefer none.

**Glassmorphism / heavy blur** as the general surface treatment. Costs frames, hurts contrast, dates instantly.

**Shadows on everything**, or a shadow so large it looks like a glow. → Elevation 1 for most cards; many surfaces need a border instead. On dark, shadows are invisible — use surface lightness.

**Clipped shadows.** A shadow inside a parent with `overflow: 'hidden'`, so it renders as a hard edge on one side.

**Five accent colours on one screen.** → Two maximum, plus semantic status colours used for their actual meaning.

**Status conveyed by colour alone.** Green dot vs red dot with no label. → Icon + word + colour.

**Pure black text / pure white surfaces** (light mode) and **pure black canvas** (dark mode).

**Borders on everything.** A border, a shadow and a background tint all separating the same card. → Pick one separation mechanism.

## 4. Icons and imagery

**Emoji as interface icons.** 💰 for balance, ✅ for success. Instantly reads as a prototype, renders differently per platform, and breaks screen readers.

**Giant icons.** A 64 px icon next to 14 pt text. → Icons are 20–24 in rows, 24 in tab bars, 16 for inline hints.

**Mixed icon sets.** Outline icons next to filled icons next to a differently-weighted third set.

**Decorative illustrations occupying half of an empty state**, pushing the actual action below the fold.

**Blurry raster icons.** → SVG or 3× assets.

## 5. Components and interaction

**Too many CTAs.** Three full-width primary buttons stacked. → One primary, one secondary, the rest are links or a menu.

**No pressed state.** A tap with no visual response within 100 ms reads as a broken app.

**Touch targets under 48 dp.** Chevrons, close buttons, chips and inline links are the usual offenders.

**Disabled buttons with no explanation.** The user cannot tell what to fix. → Explain the blocker inline, or keep it enabled and validate on tap.

**Modal overload.** A modal opening a modal opening an alert. → Two layers maximum; prefer a pushed screen for anything with substance.

**Bottom sheet for everything**, including content that deserves a screen or belongs inline.

**Unnecessary carousels.** Content the user must swipe through to discover, with items 2+ almost never seen.

**Switch paired with a Save button.** A switch applies immediately, by definition.

**Pull-to-refresh on a screen with nothing to refresh.**

**Custom controls where a native one exists** — a hand-rolled date wheel, a fake picker, a fake alert.

## 6. States

**Only the happy path exists.** No loading, no empty, no error. The most common AI-UI failure after over-carding.

**Spinner in the middle of a blank screen** as the only loading state. → Skeletons matching the real layout.

**A spinner for a 100 ms request.** Makes the app feel slower than showing nothing.

**Layout shift when data arrives** because the skeleton was a different shape.

**False zero.** Showing ₹0.00 while the balance loads. Alarming, and a trust defect.

**"Something went wrong"** with no cause, no retry and no next step.

**Raw error codes shown to users.** `Error: 500 Internal Server Error`.

**Empty state that looks like a bug** — a blank screen or a lone "No data".

**Error text in colour only**, with no icon and no explanation.

**Financial failure that does not say whether money moved.** The single most damaging state defect in a fintech app.

## 7. Platform

**Identical implementation on both platforms**, with iOS-style opacity fade as the only Android press feedback, or Material components on iOS.

**Hardcoded safe-area values** — `paddingTop: 44`.

**Whole app wrapped in `SafeAreaView`**, producing dead colour bands.

**Back that dead-ends** on Android, or a sheet that does not consume back.

**Swipe-back disabled** without an explicit close affordance.

**Content behind the keyboard**, or a CTA under the keyboard on a one-field screen.

**Button needs two taps** because `keyboardShouldPersistTaps` is missing.

**White flash on cold start** in dark mode.

**Font scaling disabled** (`allowFontScaling={false}`) on body text.

## 8. Motion

**Animation as decoration** — things that slide, pulse and bounce for no informational reason.

**Bouncy springs on a payment confirmation.** Playful undermines trust.

**Blocking input during a transition.**

**Animating `width`/`height`/`top`** instead of transforms.

**Staggered entry on a long list**, or entrance animations that re-fire while scrolling.

**Looping attention animations** that never stop.

**Confetti on a routine transaction.**

**Reduce Motion ignored.**

## 9. Code

**Magic numbers** — `padding: 14`, `borderRadius: 13`, `#3A7BD5` inline.

**Inline style objects** recreated every render inside a list row.

**One 800-line screen component.**

**A dependency added for something trivial** — a whole library for a divider, a gradient, or a debounce.

**A second design system introduced** alongside the project's existing one.

**Duplicated styles** copy-pasted between screens instead of a shared component.

**`Dimensions.get('window')` at module scope** — never updates on rotation or fold.

**Anonymous inline `renderItem`** and missing `keyExtractor` on long lists.

## 10. Process

**"Done" because it compiles.**

**Never running the app.**

**Screenshot captured but not looked at.**

**Reporting defects instead of fixing them.**

**Asking the user a design question** that established convention already answers.

**Rewriting working architecture** for aesthetic reasons.

**Ignoring the project's existing patterns** because a different approach was preferred.

## 11. Fast scan

Before reporting complete, grep and look for:

```bash
grep -rn "#[0-9a-fA-F]\{3,8\}" src/screens/YourScreen.tsx   # raw hex
grep -rn "allowFontScaling={false}"                          # a11y defect
grep -rn "paddingTop: [0-9]\+\|marginTop: [0-9]\+"          # magic numbers
grep -rn "Dimensions.get"                                    # non-reactive dimensions
grep -rn "TouchableOpacity" | wc -l                          # missing Pressable/ripple on Android
```

Then look at the screenshot and ask: *how many cards are on this screen, and does each one need to be a card?*
