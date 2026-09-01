# Jetpack Compose implementation

The design layer of this skill is framework-agnostic. This file is the Kotlin/Compose translation of it. When the project is native Android, read this **instead of** the React Native guidance in `components.md` §implementation, `lists-and-data.md` and `safe-areas.md` — the UX rules in those files still apply, only the APIs change.

## 1. Composable structure

- One composable, one job. A screen composable assembles; it does not fetch, format or decide.
- **Stateless by default.** Hoist state to the caller: a composable takes data and lambdas, never a ViewModel.

```kotlin
// Stateful wrapper — the only place that knows about the ViewModel
@Composable
fun WalletRoute(viewModel: WalletViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    WalletScreen(state = state, onSend = viewModel::onSend)
}

// Stateless, previewable, testable — this is where the UI lives
@Composable
fun WalletScreen(state: WalletUiState, onSend: () -> Unit, modifier: Modifier = Modifier)
```

- Every public composable takes `modifier: Modifier = Modifier` as its **first optional parameter**, and applies it to its outermost layout node. Skipping this makes a component un-positionable by its caller.
- Return `Unit`, name in PascalCase, no side effects in the composable body.
- Preview each state with `@Preview`: default, loading, empty, error, long content, dark. Previews are free visual QA — use them.

## 2. State

| Need | Use |
| --- | --- |
| UI-local, survives recomposition | `remember { mutableStateOf(...) }` |
| Survives configuration change | `rememberSaveable` |
| Survives process death | `SavedStateHandle` in the ViewModel |
| Derived from other state | `remember { derivedStateOf { ... } }` |
| Stream from the domain layer | `collectAsStateWithLifecycle()` |

- **`collectAsStateWithLifecycle()`, never `collectAsState()`** for flows from a ViewModel. `collectAsState` keeps collecting while the app is backgrounded, which wastes work and can leak.
- Model screen state as **one** immutable `data class` or a `sealed interface`, not five loose `mutableStateOf` values that can contradict each other.

```kotlin
sealed interface WalletUiState {
    data object Loading : WalletUiState
    data class Content(val balance: Money, val pending: Money?, val txns: List<Txn>) : WalletUiState
    data class Error(val message: String, val cached: Money?) : WalletUiState
}
```

A sealed hierarchy makes the four required states (`loading-states.md`, `empty-states.md`, `error-states.md`, content) impossible to forget — the `when` must be exhaustive.

## 3. Press feedback and touch targets

Every tappable shows feedback within 100 ms, and is at least 48 dp.

```kotlin
Modifier
    .clip(shape)                    // BEFORE clickable, or the ripple bleeds past the corners
    .clickable(
        onClick = onClick,
        role = Role.Button,
        indication = ripple(),
        interactionSource = remember { MutableInteractionSource() },
    )
    .sizeIn(minWidth = 48.dp, minHeight = 48.dp)
```

- **`.clip()` must come before `.clickable()`** — modifier order is evaluation order, and this is the single most common Compose ripple bug.
- Icon-only controls: `IconButton` already reserves 48 dp; a raw `Icon` with `.clickable` does not.
- Borderless ripple for icon controls: `ripple(bounded = false, radius = 24.dp)`.
- Use `Modifier.minimumInteractiveComponentSize()` when the visual is deliberately smaller than the target.
- `enabled = false` must also change the visual, not just swallow the tap.

## 4. Layout

| RN | Compose |
| --- | --- |
| `View` + flex | `Column` / `Row` / `Box` |
| `gap` | `Arrangement.spacedBy(spacing.md)` |
| `flex: 1` | `Modifier.weight(1f)` |
| `ScrollView` | `Modifier.verticalScroll(rememberScrollState())` |
| `FlatList` | `LazyColumn` — see `compose-performance.md` |
| `position: absolute` | `Box` + `Modifier.align()` |
| `SafeAreaView` | `WindowInsets` — see §6 |

- `Arrangement.spacedBy()` beats per-child padding: one source of spacing, no double gaps.
- Never a fixed `height` on anything containing text — use `heightIn(min = ...)` so font scaling can grow it.
- `Modifier.fillMaxWidth()` inside a `LazyColumn` item, not `fillMaxSize()`.

## 5. Theming

Do **not** consume `MaterialTheme.colorScheme` directly across the app when the product has its own brand. See `compose-theming.md` for the design-token bridge. The rule from `design-system.md` is unchanged: no literal `Color(0xFF...)`, no literal `16.dp`, outside the theme.

## 6. Window insets (edge-to-edge)

Android 15+ enforces edge-to-edge. Content draws under the system bars by default.

```kotlin
// Activity
enableEdgeToEdge()
```

```kotlin
// Consume insets where content lives, not globally
Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing,
) { padding ->
    LazyColumn(contentPadding = padding) { ... }
}
```

| Inset | Use |
| --- | --- |
| `WindowInsets.safeDrawing` | Default — status bar + navigation bar + cutout + IME |
| `WindowInsets.systemBars` | Status + navigation only |
| `WindowInsets.ime` | Keyboard |
| `WindowInsets.navigationBars` | Bottom bar clearance |

- Backgrounds go edge-to-edge; **padding** respects insets. Same rule as `safe-areas.md`.
- Pass insets to a `LazyColumn` as `contentPadding`, not `Modifier.padding` — padding clips the scroll, `contentPadding` lets content scroll under the bars while keeping the last item reachable.
- `Modifier.windowInsetsPadding(WindowInsets.navigationBars)` on a bottom-pinned CTA.
- Do not apply the same inset twice — `Scaffold` already gives you `padding`.

## 7. Keyboard

```kotlin
// Manifest: android:windowSoftInputMode="adjustResize"
Modifier.imePadding()                    // container grows with the keyboard
Modifier.imeNestedScroll()               // scroll view follows the IME
```

- `Modifier.imePadding()` on the scrollable container, or `WindowInsets.ime` merged into `safeDrawing`.
- `bringIntoViewRequester` to scroll the focused field clear of the keyboard.
- `KeyboardOptions(keyboardType = ..., imeAction = ImeAction.Next)` and `KeyboardActions` to chain focus — see `keyboard-and-input.md` for the field-by-field mapping.
- `LocalFocusManager.current.clearFocus()` to dismiss.

## 8. Accessibility semantics

```kotlin
Modifier.semantics(mergeDescendants = true) {
    contentDescription = "Priya Sharma, sent ₹1,250, 12 March, completed"
    role = Role.Button
    stateDescription = if (selected) "Selected" else "Not selected"
}
```

- `mergeDescendants = true` collapses a row into one TalkBack stop — the Compose equivalent of grouping in `accessibility.md` §3.
- Decorative images: `contentDescription = null`. Meaningful ones: describe the meaning, not the picture.
- `Modifier.clearAndSetSemantics {}` to hide inner nodes entirely.
- Custom actions: `customActions = listOf(CustomAccessibilityAction("Delete") { ... true })` so gesture-only actions are reachable.
- `LocalAccessibilityManager` / `Settings.Global.ANIMATOR_DURATION_SCALE` to detect reduced motion; disable non-essential animation.
- `liveRegion = LiveRegionMode.Polite` to announce async results.

## 9. Animation

| Need | API |
| --- | --- |
| Value change | `animateFloatAsState`, `animateDpAsState`, `animateColorAsState` |
| Enter/exit | `AnimatedVisibility` |
| Content swap | `AnimatedContent` / `Crossfade` |
| Layout change | `Modifier.animateContentSize()` |
| List item move | `Modifier.animateItem()` in `LazyColumn` |
| Gesture-driven | `Animatable` + `draggable`/`pointerInput` |

- Durations and easing come from the theme, not literals — see `animations.md` §2 for the token scale.
- Animate `graphicsLayer` properties (`alpha`, `scale`, `translation`) rather than layout properties.
- All Compose animations are interruptible by default; `Animatable.animateTo` cancels cleanly.
- Respect reduced motion — replace slides with `Crossfade`.

## 10. Side effects

| Effect | Use for |
| --- | --- |
| `LaunchedEffect(key)` | Start a coroutine when the key changes (load, subscribe) |
| `DisposableEffect(key)` | Register + unregister a listener |
| `rememberCoroutineScope()` | Launch from a callback (a click handler) |
| `rememberUpdatedState` | Capture the latest lambda inside a long-lived effect |
| `SideEffect` | Publish state to a non-Compose object |

**Never** launch work directly in a composable body — it runs on every recomposition. One-shot events (navigate, show snackbar) belong in a `Channel`/`SharedFlow` from the ViewModel, consumed in a `LaunchedEffect`, not in the UI state object.

## 11. Anti-patterns

- `.clickable` before `.clip` (ripple bleeds past the corner radius)
- `collectAsState()` instead of `collectAsStateWithLifecycle()`
- Passing the ViewModel into a leaf composable
- Reading `MaterialTheme.colorScheme` directly when the app has its own brand tokens
- Literal `Color(...)`, `16.dp`, `14.sp` in a composable
- Fixed `height` on text containers (breaks font scaling)
- `Modifier.padding` where `contentPadding` is needed on a lazy list
- Missing `key` in `LazyColumn` items
- Business logic inside `@Composable`
- Launching coroutines in the composable body
- Forgetting `mergeDescendants` — every row becomes five TalkBack stops

## 12. Checklist

- [ ] Screen split into a stateful route + a stateless, previewable composable
- [ ] `modifier: Modifier = Modifier` on every public composable, applied to the root
- [ ] UI state is one sealed hierarchy; the `when` is exhaustive over all four states
- [ ] `collectAsStateWithLifecycle` everywhere
- [ ] `.clip()` before `.clickable()`; 48 dp minimum targets
- [ ] Edge-to-edge with `safeDrawing`; insets applied once, `contentPadding` on lazy lists
- [ ] `imePadding()`; keyboard type and IME action per field
- [ ] `mergeDescendants` on rows; roles, state descriptions, custom actions present
- [ ] No literal colours, dimensions or durations
- [ ] `@Preview` for default, loading, empty, error, dark, large font
