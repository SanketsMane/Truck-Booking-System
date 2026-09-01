# Kotlin and concurrency

Most Android production bugs are concurrency bugs wearing a disguise: leaked scopes, work that outlives its owner, cancellation that does not propagate, and exceptions that vanish.

## 1. Scopes

| Scope | Lives as long as | Use for |
| --- | --- | --- |
| `viewModelScope` | the ViewModel | anything driving UI state |
| `lifecycleScope` | the Activity/Fragment | UI-bound work only |
| Injected `CoroutineScope(SupervisorJob() + ioDispatcher)` | the singleton that owns it | repository background work that must survive a screen |
| `WorkManager` | the OS guarantee | work that must survive process death -> `background-work.md` |
| `GlobalScope` | forever | **never** |

`GlobalScope` is not "convenient" — it is an unstoppable, uncancellable leak. Every use is a defect.

## 2. Structured concurrency

```kotlin
// Parallel, both required — if one fails, the other is cancelled
suspend fun loadDashboard() = coroutineScope {
    val balance = async { repo.balance() }
    val txns = async { repo.recentTransactions() }
    Dashboard(balance.await(), txns.await())
}

// Independent children — one failure must not kill the siblings
suspend fun refreshAll() = supervisorScope {
    launch { runCatching { repo.refreshBalance() } }
    launch { runCatching { repo.refreshOffers() } }
}
```

- `coroutineScope` — failure cancels siblings. Use when the result is all-or-nothing.
- `supervisorScope` — failures are independent. Use for parallel refreshes where partial success is fine.
- Cancellation is **cooperative**: a tight CPU loop must call `ensureActive()` or `yield()` or it cannot be cancelled.
- `withContext(NonCancellable)` only for cleanup that must complete (closing a file, writing a final DB record). Never for real work.

## 3. Dispatchers

```kotlin
class TransactionRepository @Inject constructor(
    private val api: Api,
    private val dao: TxnDao,
    @IoDispatcher private val io: CoroutineDispatcher,   // injected, so tests can swap it
) {
    suspend fun sync() = withContext(io) { ... }
}
```

| Dispatcher | For |
| --- | --- |
| `Main` | UI only |
| `Main.immediate` | avoid an unnecessary dispatch when already on main |
| `IO` | network, disk, DB |
| `Default` | CPU-bound work: parsing, sorting, crypto, image processing |
| `Unconfined` | essentially never in app code |

**A suspend function must be main-safe** — it switches internally so callers never need to think about threading. Retrofit and Room already are; your own file/crypto code is not.

## 4. Flow

```kotlin
// Cold flow from the DB — the single source of truth
fun observeTransactions(): Flow<List<Transaction>> =
    dao.observeAll()
        .map { entities -> entities.map(TxnEntity::toDomain) }
        .flowOn(io)                      // upstream on IO; downstream unaffected
        .distinctUntilChanged()
```

| Operator | Use |
| --- | --- |
| `flowOn` | move **upstream** work off the main thread |
| `stateIn` | hot state with a current value (UI state) |
| `shareIn` | hot event stream with no current value |
| `distinctUntilChanged` | stop redundant emissions |
| `debounce` | search input (~300 ms) |
| `flatMapLatest` | cancel the previous request when input changes |
| `retryWhen` | transient failure with backoff |
| `catch` | handle upstream exceptions — never swallow silently |
| `combine` | merge independent streams into one state |
| `conflate` | drop intermediate values when the collector is slow |

**Collect with lifecycle awareness** in the UI: `collectAsStateWithLifecycle()` in Compose, or `repeatOnLifecycle(STARTED)` in a Fragment. Plain `collect` in `lifecycleScope.launch` keeps running while backgrounded.

`callbackFlow` for bridging listener APIs — and `awaitClose { unregister() }` is mandatory, or you leak:

```kotlin
fun connectivity(): Flow<Boolean> = callbackFlow {
    val cb = object : NetworkCallback() { /* trySend(...) */ }
    cm.registerNetworkCallback(request, cb)
    awaitClose { cm.unregisterNetworkCallback(cb) }
}
```

## 5. Exceptions and cancellation

`CancellationException` is **normal control flow**. Catching it breaks cancellation:

```kotlin
// WRONG — swallows cancellation, coroutine cannot be cancelled cleanly
try { work() } catch (e: Exception) { log(e) }

// RIGHT
try { work() } catch (e: CancellationException) { throw e } catch (e: Exception) { log(e) }

// Or use runCatching's safer sibling
suspend inline fun <T> safeCall(block: () -> T): Result<T> =
    try { Result.Success(block()) }
    catch (e: CancellationException) { throw e }
    catch (e: Exception) { Result.Failure(e.toDataError()) }
```

- Exceptions in `async` surface at `await()`, not at launch.
- `CoroutineExceptionHandler` only works on `launch` in a root scope, not on `async`.
- Never `catch (e: Exception) {}` with an empty body. Never log-and-return-null as an error strategy. -> `architecture.md` §7

## 6. Kotlin conventions

- **Immutable by default**: `val`, `data class`, read-only collections. Expose `List`, keep `MutableList` private.
- **Sealed hierarchies** for states and errors — the compiler then forces you to handle every case.
- **Value classes** for identifiers so they cannot be swapped: `@JvmInline value class UserId(val value: String)`.
- **Never `Double`/`Float` for money.** Integer minor units in a value class, or `BigDecimal`. -> `../../mobile-product-engineer/references/fintech-ux.md`
- **No platform-type leaks**: annotate or wrap Java interop so nullability is explicit.
- `requireNotNull`/`checkNotNull` with a message, not `!!`.
- Extension functions for mapping (`TxnDto.toEntity()`), not utility classes.
- `Instant`/`LocalDate` (`java.time`, desugared if minSdk < 26), never `Date`.

## 7. Testing concurrency

```kotlin
@Test fun `emits content after load`() = runTest {
    val vm = WalletViewModel(fakeRepo, SavedStateHandle())
    vm.state.test {                      // turbine
        assertEquals(Loading, awaitItem())
        assertTrue(awaitItem() is Content)
    }
}
```

- `runTest` + `StandardTestDispatcher`; inject the dispatcher rather than mocking `Dispatchers`.
- `MainDispatcherRule` to replace `Dispatchers.Main`.
- Turbine for Flow assertions.
- Test the cancellation path explicitly — it is where the bugs are. -> `testing.md`

## 8. Anti-patterns

- `GlobalScope.launch`
- `runBlocking` anywhere outside tests or an `Application` init edge case
- Catching `CancellationException`
- `catch (e: Exception) {}` or log-and-return-null
- Hardcoded `Dispatchers.IO` inside a class
- `collect` without `repeatOnLifecycle` / `collectAsStateWithLifecycle`
- `callbackFlow` without `awaitClose`
- `SharingStarted.Eagerly` by default
- `Double` for currency
- `!!` instead of a checked failure
- Suspend functions that are not main-safe

## 9. Checklist

- [ ] No `GlobalScope`; every scope tied to an owner
- [ ] Dispatchers injected; suspend functions main-safe
- [ ] `CancellationException` rethrown everywhere it is caught
- [ ] Flows collected lifecycle-aware
- [ ] `callbackFlow` always unregisters in `awaitClose`
- [ ] Errors mapped to typed results, never swallowed
- [ ] Money never in floating point
- [ ] Sealed types for state and error branches
- [ ] Cancellation path covered by a test
