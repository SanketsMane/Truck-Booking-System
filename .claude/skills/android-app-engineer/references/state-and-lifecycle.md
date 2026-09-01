# State and lifecycle

Android will kill your process. Design for it, and most "impossible" bug reports disappear.

## 1. The three levels of state loss

| Event | Survived by | Example |
| --- | --- | --- |
| **Recomposition** | `remember` | a ripple animation |
| **Configuration change** (rotation, font scale, theme, locale, fold) | `rememberSaveable`, ViewModel | a half-typed form |
| **Process death** (backgrounded, memory pressure) | `SavedStateHandle`, DataStore, Room | the amount the user entered before switching to their SMS app |

The third one is the one teams skip, and it is the most common in the real world — a user leaves your payment screen to read an OTP, the OS reclaims memory, and they return to a blank form.

## 2. Testing process death

You cannot claim this works without doing it:

```bash
# 1. open the screen, enter data
# 2. background the app (home button)
adb shell am kill <applicationId>          # simulates OS reclamation, keeps the task
# 3. reopen from Recents — state must be intact
```

Or enable **Developer options → Don't keep activities**, which makes every backgrounding destroy the activity. Run the whole app through once with it on before shipping.

## 3. SavedStateHandle

```kotlin
class SendMoneyViewModel @Inject constructor(
    private val handle: SavedStateHandle,
) : ViewModel() {

    // Survives process death; backed by the saved instance state bundle
    var amountMinor: Long
        get() = handle["amount"] ?: 0L
        set(v) { handle["amount"] = v }

    val recipientId: String = handle.toRoute<SendMoney>().recipientId
}
```

- Only small, primitive-ish data. The bundle has a hard size limit (~500 KB per transaction) and exceeding it throws `TransactionTooLargeException`.
- **Never** put tokens, PANs or full account numbers in `SavedStateHandle` — the bundle is written to disk.
- Anything large or sensitive goes to Room/DataStore/encrypted storage, and only its id goes in the handle.

## 4. ViewModel

- Survives configuration change; does **not** survive process death (except via `SavedStateHandle`).
- Never holds a `Context`, `Activity`, `View` or navigation controller.
- `viewModelScope` is cancelled in `onCleared()` — work that must outlive the screen belongs in an injected scope or WorkManager. -> `background-work.md`
- Scope to the navigation graph for a multi-step flow so all steps share one instance. -> `../../mobile-product-engineer/references/compose-navigation.md`

## 5. Lifecycle-aware collection

```kotlin
// Compose
val state by viewModel.state.collectAsStateWithLifecycle()

// View system
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) { viewModel.state.collect { render(it) } }
}
```

Plain `collect` inside `lifecycleScope.launch` keeps collecting while the app is backgrounded — wasted work, wasted battery, and a source of "the UI updated while invisible" bugs.

## 6. Application lifecycle

```kotlin
ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
    override fun onStart(owner: LifecycleOwner) { /* app foregrounded */ }
    override fun onStop(owner: LifecycleOwner)  { /* app backgrounded */ }
})
```

Use it for:
- Session inactivity timers and app-lock re-authentication -> `../../mobile-product-engineer/references/security-ux.md`
- Obscuring the app-switcher snapshot (`FLAG_SECURE`, or a cover view on `onStop`)
- Refreshing a balance on return to foreground
- Pausing polling while backgrounded

`Activity.onStop` fires per-activity; `ProcessLifecycleOwner` fires per-app. For "did the user leave the app?", you want the latter.

## 7. Configuration changes

Rotation is only one of them. The same recreation happens on: font scale change, dark-mode toggle, locale change, and **foldable posture change**.

- Do **not** add `android:configChanges` to dodge recreation. It hides the bug rather than fixing it, and breaks resource reloading.
- Read window size reactively (`WindowSizeClass`, `useWindowDimensions` equivalent) rather than caching it. -> `../../mobile-product-engineer/references/responsive-mobile.md`
- Test rotation on every screen with input.

## 8. Activity and task behaviour

- `launchMode` defaults are almost always right. `singleTask`/`singleInstance` break deep links and Recents in subtle ways — use only with a specific reason.
- `onNewIntent` must be handled when the activity is `singleTop` and a deep link arrives. -> `deep-links.md`
- Do not assume `onCreate(savedInstanceState == null)` means a cold start; it also means a fresh task after process death.

## 9. Background execution limits

Since Android 8, a backgrounded app cannot freely start services or receive most implicit broadcasts.

| Need | Primitive |
| --- | --- |
| Deferrable, guaranteed | `WorkManager` |
| User-visible, ongoing, immediate | Foreground service with a declared type |
| Exact time | `AlarmManager` with `SCHEDULE_EXACT_ALARM` (justify it — Play scrutinises this) |
| While the UI is visible | coroutine in `viewModelScope` |

Doze and App Standby defer work when the device is idle. Anything time-sensitive must say so, and anything not time-sensitive must not pretend to be. -> `background-work.md`

## 10. Leaks

Common sources:
- A listener registered in `onCreate` and never unregistered
- `callbackFlow` without `awaitClose`
- A `Context` captured in a singleton or a long-lived callback
- An inner class holding an implicit outer `Activity` reference
- A coroutine in a scope that outlives its owner

Detect with LeakCanary in debug builds. A leaked `Activity` is a real user-visible OOM on low-memory devices.

## 11. Anti-patterns

- Assuming the process is never killed
- `SavedStateHandle` holding large or sensitive data
- `android:configChanges` used to avoid handling recreation
- `Context` in a ViewModel
- Plain `collect` without `repeatOnLifecycle`
- `singleTask` chosen without a reason
- Work that must complete launched in `viewModelScope`
- Caching screen dimensions at startup
- Never testing with "Don't keep activities"

## 12. Checklist

- [ ] Tested with "Don't keep activities" on, and with `adb shell am kill`
- [ ] User input survives process death via `SavedStateHandle` or persistence
- [ ] Nothing sensitive or large in the saved-state bundle
- [ ] ViewModel holds no `Context` or navigation reference
- [ ] Flows collected lifecycle-aware
- [ ] Rotation and font-scale change verified on every input screen
- [ ] Foreground/background transitions drive session lock and refresh
- [ ] App-switcher snapshot obscured on sensitive screens
- [ ] Work that must complete is not in `viewModelScope`
- [ ] LeakCanary clean on the touched screens
