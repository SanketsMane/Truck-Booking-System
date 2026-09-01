# Project integration

Joining an existing codebase is a research task before it is a design task. The project's conventions outrank this skill's defaults.

## 1. Inspect before you write (Phase 5, step 1)

Run this reconnaissance every time you touch an unfamiliar project:

```bash
cat package.json                      # framework, RN/Expo version, UI libs, state, nav, animation
ls -R src app 2>/dev/null | head -60  # structure and naming conventions
cat app.json app.config.* 2>/dev/null # Expo config, orientation, theme, splash
cat tsconfig.json                     # aliases, strictness
ls android ios 2>/dev/null            # bare RN vs managed Expo
```

Then find the design system and the patterns:

```bash
# tokens / theme
grep -rl "theme\|tokens\|colors\|palette" src --include=*.ts --include=*.tsx | head -20
# existing components
ls src/components src/ui src/design-system 2>/dev/null
# navigation
grep -rl "createNativeStackNavigator\|createBottomTabNavigator\|expo-router" src app | head
# a representative existing screen — read at least one, fully
```

**Read one complete existing screen** before writing a new one. It tells you more about the project's conventions than any config file.

## 2. What to determine

| Question | Where to look |
| --- | --- |
| Expo (managed/dev-client) or bare RN? | `package.json`, presence of `android/` `ios/` |
| RN + React version, New Architecture on? | `package.json`, `app.json`, `gradle.properties` |
| Navigation library and structure | `expo-router` file tree, or navigator files |
| Design tokens: do they exist, where, what shape? | theme/constants/styles directories |
| Component library in use? | `react-native-paper`, `tamagui`, `gluestack`, `nativewind`, or bespoke |
| Styling approach | `StyleSheet`, NativeWind/Tailwind, styled-components, restyle |
| State management | Redux/Zustand/Jotai/Context; server state via TanStack Query/SWR/RTK Query |
| Animation library | Reanimated version, Moti, `Animated` |
| Bottom sheet library | `@gorhom/bottom-sheet`, or native modal |
| List library | `FlatList` or FlashList |
| Icon set | `@expo/vector-icons`, `react-native-svg` assets, a custom set |
| Fonts | `expo-font`, `react-native.config.js`, asset folder |
| Dark mode support | `useColorScheme` usage, a theme provider, a persisted preference |
| i18n / RTL | `i18next`, `expo-localization` |
| Testing setup | Jest config, Maestro/Detox, Storybook |
| Lint/format rules | `.eslintrc`, `biome.json`, `.prettierrc` |

Write down the answers before designing. Phase 3 decisions change completely depending on whether a token system already exists.

## 3. The reuse ladder

Resolve every implementation need in this order, and stop at the first that works:

1. **An existing component** in this project. Use it, even if you would have designed it differently.
2. **An existing component, extended** with a new prop or variant — additive, backwards-compatible.
3. **A new component built from existing tokens and primitives.**
4. **A new token added to the theme**, then a new component.
5. **A new dependency** — only after §5 below.

Introducing a parallel design system is the worst outcome. Two button components with different paddings is a permanent tax on the project.

## 4. Working with an existing design system

- **Tokens exist** → use them exactly. Map this skill's semantic names onto theirs; do not rename their tokens.
- **Tokens are partial** (colours but no spacing scale) → use what exists, add the missing scale **in the same file, in the same style**, and follow their naming convention rather than this skill's.
- **No tokens at all, hardcoded values everywhere** → do not refactor the whole app uninvited. Create a theme file, use it for your new work, and tell the user that a migration is available as a separate task.
- **A component library is in use** → theme it rather than replacing it. Wrap its components in project-level components if you need consistent defaults.
- **Their conventions conflict with this skill** (e.g. an 8 pt spacing scale, or a 6 px radius standard) → **their convention wins**. Consistency inside the app beats correctness in the abstract. Note the difference once; do not fight it.

## 5. Dependency decision

Before adding any package:

1. **Does the project already solve this?** Check `package.json` and existing code. A gradient library when `expo-linear-gradient` is already installed, or a date library when `date-fns` is present, is a defect.
2. **Can existing dependencies do it?** Reanimated covers most animation needs; `react-native-svg` covers most icon needs.
3. **Is it trivial?** A divider, a badge, a debounce, a simple chip — write the 30 lines.
4. **If a package is genuinely needed**, judge it on: maintenance (commits in the last 6 months), install size, New Architecture / Fabric support, whether it requires native linking (a blocker in Expo Go), TypeScript types, and download volume.
5. **Prefer the ecosystem standard**: Reanimated + Gesture Handler, `@gorhom/bottom-sheet`, `react-native-safe-area-context`, `@shopify/flash-list`, `expo-image`, `react-native-keyboard-controller`.
6. **Tell the user** what you added and why, in one line.

Never add a package to solve a trivial styling problem. Never add a UI kit to build one screen.

## 6. Expo vs bare RN

| | Expo (managed / dev client) | Bare RN |
| --- | --- | --- |
| Native config | `app.json` / `app.config.ts`, config plugins | `Info.plist`, `AndroidManifest.xml`, Gradle |
| Adding native deps | Needs a dev-client rebuild; Expo Go cannot load arbitrary native code | `pod install` + rebuild |
| Fonts | `expo-font` | `react-native.config.js` + link |
| Icons/splash | `expo-splash-screen`, config | native asset catalogs |
| Updates | `expo-updates` (OTA) | store releases |

Check which one you are in before suggesting a native change. Telling an Expo Go user to edit `Info.plist` is a wasted round trip — they need a config plugin and a dev client build.

## 7. Preserve what works

- Do not rewrite working architecture for aesthetic reasons.
- Do not "modernise" a state library, a navigation setup or a styling approach unless that is the actual task.
- Do not reformat files you did not otherwise change — it buries the real diff.
- Match the surrounding code's naming, file layout, import ordering and comment density.
- Keep existing public props and behaviour when extending a component; additions are additive.
- If existing code has a real bug adjacent to your work, mention it — fix it only if it blocks the task or the user agrees.

## 8. New project setup

If the project is genuinely new and has no design system, establish it **first**, before the first screen:

1. `theme/tokens.ts` — spacing, layout, radius, type, elevation, motion, sizing, plus the private palette. -> `design-system.md`
2. `theme/theme.ts` — `lightTheme` / `darkTheme`: semantic colour built from the palette, one shared `Theme` type. -> `colors.md`, `dark-mode.md`
3. `theme/ThemeProvider.tsx` — provider, `useTheme()`, `useThemedStyles()`.
4. Primitives: `Text`, `Button`, `Card`/`Surface`, `Input`, `Row`, `Divider`, `Screen` (handling safe areas + gutter).
5. State components: `Skeleton`, `EmptyState`, `ErrorState`, `Loading`.
6. Then the first screen.

Ready-to-adapt versions live in `../../../templates/`.

## 9. Reporting back

When you finish, state briefly:
- Which existing components and tokens you reused.
- What you added to the theme, and why.
- Any dependency added, and why nothing existing sufficed.
- Any inconsistency you found but deliberately did not fix.
