# Compose performance

Compose jank almost always comes from **too many recompositions** or **unkeyed lazy lists**, not from drawing. The targets in `performance.md` §1 are unchanged; this is how you hit them in Compose.

## 1. The three phases

Composition → Layout → Draw. Cheapest fix is always to move work **later**:

| Instead of | Do | Why |
| --- | --- | --- |
| Reading state in composition | Read it in layout/draw via a lambda | Skips recomposition entirely |
| `Modifier.offset(x = scrollX.dp)` | `Modifier.offset { IntOffset(scrollX, 0) }` | Lambda version defers to layout |
| `Modifier.background(color)` with animated colour | `Modifier.drawBehind { drawRect(color) }` | Defers to draw |
| `alpha = animatedValue` | `Modifier.graphicsLayer { alpha = animatedValue }` | Defers to draw |

Rule of thumb: if a value changes every frame (scroll offset, animation), read it inside a **lambda-based** modifier. Reading it directly in the composable body recomposes the whole subtree 60 times a second.

## 2. Lazy lists

```kotlin
LazyColumn(contentPadding = innerPadding) {
    items(
        items = transactions,
        key = { it.id },              // STABLE id — never the index
        contentType = { it.type },    // lets Compose reuse compatible item layouts
    ) { txn ->
        TransactionRow(txn)           // hoisted, not an inline lambda body doing work
    }
}
```

- **`key` is not optional.** Without it, insert/remove reuses the wrong slots, animations jump, and state (expanded row, text field) attaches to the wrong item.
- `contentType` improves reuse when a list mixes row shapes (header / transaction / ad).
- Never nest a scrollable in the same direction — a `LazyColumn` inside a `verticalScroll` **crashes** or renders unbounded. Use one `LazyColumn` with `item {}` headers instead.
- `LazyColumn(userScrollEnabled)` and `stickyHeader` for date grouping — see `lists-and-data.md`.
- Format dates and currency once when the data enters the ViewModel, never in the item composable.
- Avoid `Modifier.animateItem()` on very long lists during fast scroll.

## 3. Stability and skipping

Compose skips recomposing a composable when all its parameters are **stable** and unchanged. Instability is the main cause of over-recomposition.

Unstable by default:
- `List`, `Map`, `Set` (the interface is mutable-able, so Compose assumes it can change)
- Classes from other modules without the Compose compiler applied
- Any class with a `var` property

Fixes:

```kotlin
// 1. Use immutable collections
implementation("org.jetbrains.kotlinx:kotlinx-collections-immutable:...")
data class WalletUiState(val txns: ImmutableList<Txn>)

// 2. Or annotate
@Immutable data class Txn(val id: String, val amount: Money)

// 3. Enable strong skipping (Kotlin 2.0+ Compose compiler) — makes most
//    unstable-parameter cases skip anyway
composeCompiler { ... }   // strong skipping is on by default in recent versions
```

Diagnose with compiler metrics:

```bash
./gradlew assembleRelease \
  -Pandroidx.enableComposeCompilerMetrics=true \
  -Pandroidx.enableComposeCompilerReports=true
# then read build/compose_metrics/*-composables.txt for "restartable skippable"
```

A composable marked `restartable` but **not** `skippable` is a recomposition hotspot.

## 4. Lambdas and captures

```kotlin
// BAD — new lambda every recomposition, breaks skipping in the child
TransactionRow(onClick = { viewModel.open(txn.id) })

// GOOD — stable method reference
TransactionRow(txn = txn, onClick = viewModel::open)
```

- Prefer method references and `remember`ed lambdas for callbacks passed into lazy list items.
- With strong skipping enabled, lambdas are auto-remembered — but method references are still clearer and cheaper.

## 5. derivedStateOf

Use it when a **frequently changing** state produces a **rarely changing** result:

```kotlin
// Recomposes only when the boolean flips, not on every scroll pixel
val showScrollToTop by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 5 }
}
```

Do **not** wrap a simple transformation of a rarely-changing value — that adds cost for nothing.

## 6. Measuring

| Tool | Finds |
| --- | --- |
| Layout Inspector → Recomposition counts | Which composable recomposes and how often |
| Compose compiler metrics | Non-skippable composables, unstable classes |
| Macrobenchmark + `FrameTimingMetric` | Real jank, P50/P90/P99 frame times |
| Perfetto / `Trace.beginSection` | Where a slow frame went |
| `adb shell dumpsys gfxinfo <pkg> framestats` | Frame timing on device |

**Always measure a release build with R8 on.** Debug Compose is several times slower; benchmarking a debug build produces meaningless numbers and wasted optimisation.

## 7. Baseline profiles

The single highest-leverage Compose performance change. A baseline profile AOT-compiles your hot startup and scroll paths, typically cutting cold start 20–30% and eliminating first-scroll jank.

```kotlin
// build.gradle.kts
plugins { id("androidx.baselineprofile") }
```

Generate with a `BaselineProfileGenerator` macrobenchmark that exercises startup plus your two or three most-scrolled screens. Regenerate when navigation or startup changes materially. See `../../android-app-engineer/references/performance.md` for the build wiring.

## 8. Startup

- Keep the first frame cheap: no blocking I/O, no large `remember` computations in the root composable.
- `SplashScreen` API for the launch window; do not gate it on a network call.
- Lazy-initialise heavy singletons; prefer `androidx.startup` with explicit ordering over blocking `Application.onCreate`.
- Defer analytics and remote-config init until after first frame.

## 9. Images

- Coil (`AsyncImage`) with an explicit `Modifier.size()` so layout does not shift on load.
- Request the display size, not the source size: `ImageRequest.Builder(context).size(width, height)`.
- `placeholder` / `crossfade(true)` for a stable loading experience.
- Vector drawables for icons; avoid large raster assets.

## 10. Anti-patterns

- Missing or index-based `key` in a lazy list
- `LazyColumn` nested inside `verticalScroll`
- Reading scroll offset directly in a composable body
- `List<T>` in UI state instead of `ImmutableList<T>`
- Inline lambdas capturing loop variables in list items
- Formatting money/dates inside the item composable
- `derivedStateOf` on values that rarely change
- Benchmarking a debug build
- No baseline profile
- `collectAsState()` instead of `collectAsStateWithLifecycle()`

## 11. Checklist

- [ ] Every lazy list item has a stable `key`
- [ ] No same-direction nested scrolling
- [ ] UI state uses immutable/`@Immutable` types
- [ ] Compiler metrics run; no unexpected non-skippable composables on hot screens
- [ ] Frequently-changing values read inside lambda modifiers
- [ ] Per-row formatting hoisted out of composition
- [ ] Baseline profile generated and wired into the release build
- [ ] Measured on a low-end device with a **release** build
- [ ] Startup does no blocking I/O before the first frame
