# Performance

*React Native performance. For Jetpack Compose see `compose-performance.md`; for Android
runtime concerns (ANR, startup, baseline profiles, app size) see
`../../android-app-engineer/references/performance.md`.*

Perceived speed is a design property. A beautiful screen that stutters feels cheap.

## 1. Targets

```
cold start to first meaningful paint   < 2 s
screen transition                       < 300 ms, no blank frame
list scroll                             60 fps (16.7 ms/frame); 120 fps where supported
tap → visual feedback                   < 100 ms
tap → navigation begins                 < 100 ms
API-backed screen                       skeleton immediately, content < 1 s on a good network
```

Measure on the **worst device you support**, not on an M-series simulator. A mid-range Android from three years ago is the honest benchmark.

## 2. Lists

The most common source of jank.

- Use `FlatList`/`SectionList` with proper virtualisation, or `@shopify/flash-list` for long or complex lists.
- `keyExtractor` returning a **stable** id. Index keys break recycling and cause visual bleed-through.
- `renderItem` extracted to a module-level component wrapped in `React.memo` — never an inline arrow that closes over changing state.
- `getItemLayout` when row height is fixed; it removes measurement cost and makes `scrollToIndex` instant.
- `initialNumToRender` ≈ one screenful, not 50.
- `windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews` tuned only after measuring — defaults are usually right.
- Fixed row heights where possible. Dynamic heights cost measurement on every pass.
- Never nest a `FlatList` inside a `ScrollView` — virtualisation is destroyed. Use `ListHeaderComponent`/`ListFooterComponent`, or a `SectionList`.
- Heavy per-row work (date formatting, currency formatting, derived calculations) is done once when the data arrives, not in `renderItem`.

-> `lists-and-data.md`

## 3. Re-renders

- Memoise expensive derived values with `useMemo`; memoise callbacks passed to memoised children with `useCallback`. Do not memoise everything reflexively — memoisation has its own cost.
- Never create style objects or arrays inline in a hot path. `StyleSheet.create` once at module scope; compose with arrays only when necessary.
- Context: split by update frequency. A single context holding theme + user + a live balance re-renders the whole tree on every balance tick.
- Selector-based stores (Zustand, Redux with `useSelector`, Jotai) so a component subscribes only to what it uses.
- Keep animated values out of React state — `useSharedValue` (Reanimated) drives animation without re-rendering.
- Profile with React DevTools Profiler before optimising. Guessing wastes time and adds complexity.

## 4. Images

- Correctly sized assets. Downloading a 2000 px image for a 48 px avatar is common and expensive.
- `expo-image` or `react-native-fast-image` for caching, priority and placeholder transitions.
- Explicit `width`/`height` so layout does not shift on load.
- Placeholder or blurhash while loading.
- Prefer WebP/AVIF where the pipeline supports it.
- SVG for icons; avoid rasterising icon sets.
- Lazy-load images below the fold; never preload an entire feed.

## 5. Animation

- UI thread only: Reanimated worklets or `useNativeDriver: true`.
- Animate `transform` and `opacity`; never `width`, `height`, `top`, `margin`, or shadow properties.
- No `setState` inside a per-frame handler.
- Gesture handling via `react-native-gesture-handler`, not `PanResponder`.
- Watch for animations still running on unmounted screens.

-> `animations.md`

## 6. Navigation

- `react-native-screens` enabled so off-screen screens are detached natively.
- Lazy-load tab screens; do not mount all five tabs at launch.
- Heavy screens: render a lightweight shell first, then hydrate. Use `InteractionManager.runAfterInteractions` for non-critical work so the transition animation stays smooth.
- Avoid heavy work in the first render of a pushed screen — it shows as a stutter mid-transition.

## 7. Startup

- Defer non-critical initialisation (analytics, remote config, feature flags) until after first paint.
- Do not block the splash on network calls. Show the UI with skeletons instead.
- Hermes enabled (default on modern RN).
- Enable the New Architecture if the project's dependency set supports it; do not migrate mid-feature.
- Audit bundle size; remove unused dependencies. Every JS module costs parse time on a cold start.
- Cache the last-known critical data (balance, profile) and render it immediately with a "refreshing" indicator rather than an empty screen.

## 8. Network and data

- Show cached data instantly, revalidate in the background (stale-while-revalidate). TanStack Query / SWR / RTK Query give this for free.
- Debounce search input (~300 ms); cancel superseded requests.
- Paginate; never fetch 1000 records to display 20.
- Request only needed fields.
- Parallelise independent requests; do not chain them serially.
- Optimistic updates for high-confidence actions (marking read, favouriting) — **never** for money movement. -> `loading-states.md`
- Handle slow networks explicitly: a timeout with a retry beats an indefinite spinner.

## 9. Memory

- Release listeners, timers, subscriptions and animation loops on unmount.
- Bound image caches.
- Do not hold large arrays in state when a virtualised list can page.
- Watch for closures capturing large objects in long-lived callbacks.
- Android low-memory devices kill backgrounded apps — restore state gracefully. -> `android.md`

## 10. Measuring

| Tool | Use |
| --- | --- |
| Flipper / React Native DevTools | Inspect, network, performance |
| React DevTools Profiler | Re-render causes |
| Perf monitor overlay (dev menu) | JS and UI thread FPS |
| Xcode Instruments (Time Profiler, Allocations) | iOS deep dive |
| Android Studio Profiler / Systrace | Android deep dive |
| `adb shell dumpsys gfxinfo <pkg>` | Frame timing on device |
| Bundle visualiser | Startup and size regressions |

Measure → change one thing → measure again. Never optimise on intuition.

## 11. Checklist

- [ ] Tested on a low-end Android device
- [ ] Long list scrolls at 60 fps with no blank frames
- [ ] `keyExtractor` stable; `renderItem` memoised and module-level
- [ ] No `FlatList` inside a `ScrollView`
- [ ] Images sized, cached, dimensioned
- [ ] Animations on the UI thread, transforms only
- [ ] No inline styles or object literals in hot paths
- [ ] Cold start under 2 s; nothing blocking the splash on network
- [ ] Cached data shown immediately where possible
- [ ] Listeners and timers cleaned up
- [ ] Tab screens lazily mounted
