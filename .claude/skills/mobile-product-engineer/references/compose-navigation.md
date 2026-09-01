# Compose navigation

The navigation *decisions* live in `navigation.md` — this is the Kotlin implementation of them. Back behaviour is a system guarantee on Android; treat every rule here as mandatory, not stylistic.

## 1. Type-safe routes

Navigation Compose 2.8+ supports `@Serializable` route objects. Use them — string routes with manual argument encoding are a defect source.

```kotlin
@Serializable data object Home
@Serializable data object Activity
@Serializable data class TransactionDetail(val id: String)
@Serializable data class SendMoney(val recipientId: String? = null)

NavHost(navController, startDestination = Home) {
    composable<Home> { HomeRoute(onOpenTxn = { navController.navigate(TransactionDetail(it)) }) }
    composable<TransactionDetail> { entry ->
        val args = entry.toRoute<TransactionDetail>()
        TransactionDetailRoute(id = args.id)
    }
}
```

- Never pass whole objects between screens — pass an id and re-read from the repository. A serialised object goes stale and bloats the back stack.
- Never pass sensitive values (PAN, tokens, full account numbers) as route arguments; they land in logs and saved state.

## 2. Navigation belongs to the caller

A screen composable does **not** hold a `NavController`.

```kotlin
// Route layer wires navigation; the screen just reports intent
composable<Home> {
    HomeRoute(
        onOpenTxn = { navController.navigate(TransactionDetail(it)) },
        onSend = { navController.navigate(SendMoney()) },
    )
}
```

This keeps screens previewable and testable, and stops navigation logic scattering through the UI tree.

## 3. Back behaviour

Every screen must answer "what does back do here?" — see `navigation.md` §back.

```kotlin
// Intercept back for unsaved input
var showDiscard by remember { mutableStateOf(false) }
BackHandler(enabled = hasUnsavedInput) { showDiscard = true }
```

Rules:

- A sheet, dialog or search overlay **consumes back** to dismiss itself before back pops the stack.
- Never dead-end: back from a nested screen must not exit the app.
- Unsaved input triggers a discard confirmation, not silent loss.
- On the start destination, back returns to it, then exits — do not trap the user.
- `BackHandler(enabled = false)` when the interception no longer applies; a permanently-enabled handler swallows back.

**Predictive back** (Android 14+, default from 16): set `android:enableOnBackInvokedCallback="true"` in the manifest and use `BackHandler` / `PredictiveBackHandler`. A legacy `onBackPressed` override kills the preview animation.

```kotlin
PredictiveBackHandler(enabled = hasUnsavedInput) { progress ->
    try { progress.collect { /* drive an animation from it.progress */ } ; showDiscard = true }
    catch (e: CancellationException) { /* user released — snap back */ }
}
```

## 4. Bottom navigation

```kotlin
navController.navigate(destination) {
    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
    launchSingleTop = true
    restoreState = true
}
```

All three matter:
- `popUpTo(start) { saveState = true }` stops the back stack growing forever as the user taps between tabs.
- `launchSingleTop` prevents duplicate copies of the same tab.
- `restoreState` preserves each tab's scroll position and internal stack — without it, tabs feel broken.

Tab bar rules (3–5 destinations, always-visible labels, 48 dp targets, clears the gesture inset) are in `android.md` §5.

## 5. Nested graphs and flows

Model a self-contained task (send money, KYC, onboarding) as a **nested graph**, so the whole flow can be popped as a unit:

```kotlin
@Serializable data object SendMoneyGraph

navigation<SendMoneyGraph>(startDestination = SendRecipient) {
    composable<SendRecipient> { ... }
    composable<SendAmount> { ... }
    composable<SendReview> { ... }
    composable<SendResult> { ... }
}

// From the result screen, return home and drop the whole flow
navController.navigate(Home) { popUpTo(SendMoneyGraph) { inclusive = true } }
```

This is how you implement "back from Result goes home, never back into the flow" from `../../../examples/send-money-flow.md`.

Share flow state with a graph-scoped ViewModel:

```kotlin
val parentEntry = remember(entry) { navController.getBackStackEntry(SendMoneyGraph) }
val flowViewModel: SendMoneyViewModel = hiltViewModel(parentEntry)
```

## 6. Results between screens

Do **not** use `savedStateHandle` on the previous entry as a general result channel — it is easy to get wrong and leaks across process death.

Prefer: the detail screen writes to the repository, and the list observes it. A single source of truth removes the result-passing problem entirely.

When a genuine one-shot result is needed (a picker returning a selection), use the previous entry's `SavedStateHandle` deliberately and clear it after reading.

## 7. Deep links

```kotlin
composable<TransactionDetail>(
    deepLinks = listOf(navDeepLink<TransactionDetail>(basePath = "https://example.com/txn")),
) { ... }
```

A deep link must land with a **sensible back stack** — back from a deep-linked detail screen goes to Activity, not out of the app. Use `NavDeepLinkBuilder` or a nested graph whose start destination is the parent.

App Links verification, intent filters and the manifest side are in `../../android-app-engineer/references/deep-links.md`.

## 8. Transitions

```kotlin
composable<TransactionDetail>(
    enterTransition = { slideIntoContainer(SlideDirection.Start, tween(320)) },
    exitTransition  = { slideOutOfContainer(SlideDirection.Start, tween(320)) },
)
```

- Durations from the motion tokens (`design-system.md` §7), not literals.
- Flow steps slide forward consistently; tab switches cross-fade or do not animate.
- Respect reduced motion — fall back to `fadeIn`/`fadeOut`.
- See `animations.md` §4.

## 9. Sheets and dialogs

- `ModalBottomSheet` (Material 3) with `sheetState`, a drag handle when dismissible, and `skipPartiallyExpanded` decided deliberately.
- Set `properties = ModalBottomSheetProperties(shouldDismissOnBackPress = true)` — and confirm before discarding unsaved input.
- Dialogs: `AlertDialog` for a blocking decision only, two actions max, destructive action styled and labelled with its verb.
- Do not stack sheets more than two deep. See `bottom-sheets.md`, `dialogs-and-modals.md`.

## 10. Anti-patterns

- String routes with hand-encoded arguments
- Passing a `NavController` into a screen composable
- Passing whole domain objects (or secrets) as route arguments
- Bottom-nav navigation without `saveState`/`restoreState`/`launchSingleTop`
- `BackHandler` left permanently enabled
- Legacy `onBackPressed` override (breaks predictive back)
- Deep link landing with an empty back stack
- A multi-step flow built as four sibling destinations instead of a nested graph
- Literal durations in transitions

## 11. Checklist

- [ ] Type-safe `@Serializable` routes; ids passed, not objects; no secrets in arguments
- [ ] Screens take lambdas, not a `NavController`
- [ ] Back defined for every screen; sheets/dialogs consume it; no dead ends
- [ ] Unsaved input triggers discard confirmation
- [ ] Predictive back enabled in the manifest; no legacy `onBackPressed`
- [ ] Bottom nav uses `popUpTo(start){saveState}` + `launchSingleTop` + `restoreState`
- [ ] Multi-step flows are nested graphs, popped as a unit
- [ ] Deep links land with a synthesised back stack
- [ ] Transition durations from tokens; reduced motion respected
