# Architecture

One job per layer, dependencies pointing inward, and no Android framework below the ViewModel.

## 1. The layers

```
UI            Compose screens          renders state, emits events        (mobile-product-engineer owns this)
  ↓
ViewModel     holds UiState            transforms domain → UI, survives config change
  ↓
Domain        use cases, models        pure Kotlin, no Android imports, optional layer
  ↓
Repository    single source of truth   decides local vs remote, exposes Flow
  ↓
Data sources  Room DAO · Retrofit API · DataStore · platform APIs
```

Dependencies point **downward only**. A repository never knows about a ViewModel; a domain model never imports `android.*`.

**The domain layer is optional.** Add use cases when logic is shared across ViewModels or genuinely complex. A `GetBalanceUseCase` that calls `repository.getBalance()` and nothing else is ceremony — delete it.

## 2. What goes where

| Belongs in | Not in |
| --- | --- |
| **ViewModel**: UI state, event handling, presentation formatting, `SavedStateHandle` | network calls, DB queries, business rules |
| **Repository**: caching policy, local-vs-remote decision, mapping DTO → domain, conflict resolution | UI state, formatting, `Context` |
| **Data source**: one transport (Room, Retrofit, DataStore, sensor) | business logic, caching decisions |
| **Domain model**: plain Kotlin data classes and rules | annotations from Room/Moshi/Retrofit |

Keep **three model types** and map between them:
- `TransactionDto` — the wire shape, nullable, whatever the backend sends
- `TransactionEntity` — the Room shape, with indices and a primary key
- `Transaction` — the domain shape, non-null, correct types (`Money`, `Instant`)

Sharing one class across all three couples your database schema to your JSON, which means every backend change becomes a migration.

## 3. UI state

One immutable state object per screen, exposed as `StateFlow`:

```kotlin
class WalletViewModel @Inject constructor(
    private val repo: WalletRepository,
    savedState: SavedStateHandle,
) : ViewModel() {

    val state: StateFlow<WalletUiState> = repo.observeWallet()
        .map { WalletUiState.Content(it) }
        .catch { emit(WalletUiState.Error(it.toMessage())) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000), // survives rotation, stops in background
            initialValue = WalletUiState.Loading,
        )
}
```

- `SharingStarted.WhileSubscribed(5_000)` is the correct default: the 5-second grace period keeps the flow alive across a configuration change but stops collection when the app is genuinely backgrounded. `Eagerly` leaks work; `Lazily` restarts on rotation.
- **One-shot events** (navigate, show snackbar, launch a payment sheet) do **not** belong in state — a state object replayed after rotation would fire them twice. Use a `Channel(Channel.BUFFERED).receiveAsFlow()`.

## 4. MVVM vs MVI

| | Use when |
| --- | --- |
| **MVVM** (state + method calls) | Most screens. Simpler, less boilerplate. |
| **MVI** (state + a single `onEvent(Intent)`) | Complex screens with many interdependent inputs, or when you want a replayable event log |

Pick one **per project** and stay consistent. Mixing them screen-by-screen is worse than either.

## 5. Dependency injection

**Hilt** is the default for app modules — it understands Android lifecycles and generates the boilerplate. **Koin** is reasonable for smaller apps or KMP. Manual DI is fine for a small app; a hand-rolled service locator is not.

```kotlin
@Module @InstallIn(SingletonComponent::class)
object DataModule {
    @Provides @Singleton
    fun provideDb(@ApplicationContext ctx: Context): AppDatabase =
        Room.databaseBuilder(ctx, AppDatabase::class.java, "app.db")
            .addMigrations(MIGRATION_1_2)
            .build()
}
```

Rules:
- Scope deliberately: `@Singleton` for the DB, HTTP client and DataStore; nothing else by default.
- Inject **interfaces**, not implementations, wherever you want to fake it in tests.
- Inject `CoroutineDispatcher` via a qualifier so tests can substitute a test dispatcher. Hardcoded `Dispatchers.IO` is untestable.
- Never inject `Context` below the repository layer.

```kotlin
@Qualifier annotation class IoDispatcher
@Provides @IoDispatcher fun io(): CoroutineDispatcher = Dispatchers.IO
```

## 6. Modularisation

Do **not** modularise a small app. The cost is real (Gradle config, cross-module DI, navigation plumbing) and only pays back on build times and team boundaries.

Modularise when: build times hurt, multiple teams collide, or you need a genuine feature boundary.

```
:app                     assembly, DI graph, navigation host
:core:designsystem       theme, tokens, shared components
:core:data               repositories
:core:database  :core:network  :core:common
:feature:wallet  :feature:send  :feature:profile
```

- Feature modules **never** depend on each other. Shared code moves down into `:core`.
- `:app` is the only module that knows every feature.
- Use `api` sparingly; prefer `implementation` so changes do not cascade.
- Convention plugins in `build-logic/` keep 20 module build files from drifting. -> `build-and-gradle.md`

## 7. Error modelling

Do not let exceptions cross layer boundaries untyped.

```kotlin
sealed interface DataError {
    data object Network : DataError            // no connectivity
    data object Timeout : DataError            // may have succeeded — see networking.md
    data class Http(val code: Int) : DataError
    data class Api(val code: String, val message: String) : DataError  // backend business error
    data object Unauthorized : DataError
    data object Unknown : DataError
}

sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Failure(val error: DataError) : Result<Nothing>
}
```

The UI must be able to distinguish "you're offline" from "your card was declined" from "we don't know". A single `String` error message cannot express that. -> `../../mobile-product-engineer/references/error-states.md`

## 8. Anti-patterns

- Network or DB calls in the ViewModel
- `Context` or `Activity` held below the ViewModel
- One model class annotated for Room, Moshi and the UI simultaneously
- God repository with 40 unrelated methods
- Use cases that only forward a single call
- One-shot events stored in `StateFlow`
- `SharingStarted.Eagerly` on every flow
- Feature modules depending on each other
- Hardcoded `Dispatchers.IO` inside a class
- Modularising a 6-screen app
- Mixing MVVM and MVI across screens

## 9. Checklist

- [ ] Each layer has one responsibility; dependencies point inward
- [ ] No `android.*` imports in domain or repository logic
- [ ] Separate DTO / Entity / domain models with explicit mapping
- [ ] One immutable `UiState` per screen, exposed as `StateFlow`
- [ ] `WhileSubscribed(5_000)` unless there is a reason otherwise
- [ ] One-shot events on a `Channel`, not in state
- [ ] Dispatchers injected, not hardcoded
- [ ] Errors typed as a sealed hierarchy the UI can branch on
- [ ] DI scoping deliberate; interfaces injected where faking matters
- [ ] Modularisation justified by a real problem
