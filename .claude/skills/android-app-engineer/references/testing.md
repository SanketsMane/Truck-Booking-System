# Testing

*Kotlin/Android testing. React Native testing is in
`../../mobile-product-engineer/references/testing.md`.*

Test what breaks and what costs money. Coverage percentage is not a goal.

## 1. Priorities

| Priority | What |
| --- | --- |
| Highest | Money maths, currency conversion, fee/total calculation |
| Highest | Payment/transfer flows including failure, timeout and double-submit |
| Highest | **Room migrations** — a bad one destroys user data irreversibly |
| High | Auth, token refresh, session expiry |
| High | Repository logic: cache-vs-network, error mapping, conflict resolution |
| High | ViewModel state transitions across all four UI states |
| Medium | Worker logic and idempotency |
| Medium | Deep link parsing and validation |
| Low | Pure presentational composables with no logic |

## 2. Unit tests

```kotlin
@Test fun `timeout on transfer polls status instead of failing`() = runTest {
    api.enqueueTimeout()
    api.enqueueStatus(SUCCEEDED)
    val result = repository.transfer(request)
    assertTrue(result is Result.Success)          // must NOT report failure
    assertEquals(1, api.transferCallCount)        // must NOT resubmit
}
```

- `runTest` + injected `TestDispatcher`. Never mock `Dispatchers`. -> `kotlin-and-concurrency.md`
- **Fakes over mocks** for repositories and data sources — a fake in-memory repository is more readable and less brittle than five `every { }` stubs.
- MockWebServer for the API layer: assert what was sent, and script failures, timeouts and malformed bodies.
- Turbine for Flow assertions.
- Test **every error branch**, not just the happy path. The error branches are where users live.

## 3. Room migration tests

Non-negotiable. This is the one test whose absence causes unrecoverable damage.

```kotlin
@get:Rule val helper = MigrationTestHelper(
    InstrumentationRegistry.getInstrumentation(), AppDatabase::class.java,
)

@Test fun migrate3To4() {
    helper.createDatabase(TEST_DB, 3).apply {
        execSQL("INSERT INTO transactions VALUES ('a','acc1',5000,'INR','DONE',0)")
        close()
    }
    val db = helper.runMigrationsAndValidate(TEST_DB, 4, true, MIGRATION_3_4)
    db.query("SELECT * FROM transactions").use {
        assertTrue(it.moveToFirst())
        assertEquals(5000, it.getLong(it.getColumnIndexOrThrow("amountMinor")))  // data survived
    }
}
```

Also test the **full chain** (1 → latest) — users skip versions. Requires exported schemas committed to the repo.

## 4. ViewModel tests

```kotlin
@get:Rule val mainRule = MainDispatcherRule()

@Test fun `shows error with cached data when refresh fails`() = runTest {
    repo.emit(cachedWallet)
    repo.failNext(DataError.Network)
    viewModel.state.test {
        assertEquals(Loading, awaitItem())
        val error = awaitItem() as Error
        assertEquals(cachedWallet.balance, error.cached)   // cached data still shown
    }
}
```

Assert on emitted state, never on internals. Cover: loading → content, loading → empty, loading → error, refresh failure with cache, and process-death restoration via `SavedStateHandle`.

## 5. Compose UI tests

```kotlin
@Test fun disabledSendButtonAnnouncesState() {
    composeRule.setContent { AppTheme { SendScreen(state = insufficientFunds, onSend = {}) } }
    composeRule.onNodeWithText("You need ₹250 more").assertIsDisplayed()
    composeRule.onNode(hasClickAction() and hasText("Send")).assertIsNotEnabled()
}
```

- Query by **semantics** — the same tree a screen reader uses, so missing accessibility becomes a test failure.
- `composeRule.mainClock.autoAdvance = false` to test animation and loading states deterministically.
- Prefer these over full instrumentation tests: faster, less flaky, and they exercise the states that matter.

## 6. Screenshot tests

The most practical "did the UI change?" gate, and the best available visual QA in a headless environment. -> `../../mobile-product-engineer/references/running-the-app.md`

- **Paparazzi** — JVM-only, no emulator, very fast. Cannot render everything (some hardware-backed effects).
- **Roborazzi** — Robolectric-based, broader coverage.
- Compose Preview Screenshot Testing — first-party, newer.

Snapshot each key screen in: light, dark, largest font scale, smallest width. Review diffs by eye; a diff tool nobody reads is noise.

## 7. Instrumentation and E2E

Slow and flaky — keep the suite small and reserved for flows whose failure is unacceptable:

- Sign-in including biometric fallback
- Send money: happy path, insufficient funds, network drop mid-flight, double tap
- KYC submission and resume after interruption
- Session expiry and re-auth returning to the right place

Use `IdlingResource` or Compose's built-in synchronisation; never `Thread.sleep`. Run on `main`, not every PR. -> `ci-cd.md`

## 8. Worker tests

```kotlin
@Test fun `worker is idempotent`() = runTest {
    val worker = TestListenableWorkerBuilder<SyncWorker>(ctx).setWorkerFactory(factory).build()
    worker.doWork(); worker.doWork()
    assertEquals(1, dao.count())        // ran twice, one row
}
```

Every worker runs more than once in production. Prove it is safe. -> `background-work.md`

## 9. Test data

Keep one fixture set of deliberately awkward data and use it everywhere:

- A 60-character merchant name
- `₹12,34,567.89` and `₹0.00`
- Every status the API can return, including ones you think are impossible
- A user with no avatar, no last name, no transactions
- Null optional fields throughout
- A very long error message

"John Doe / ₹100.00" hides every bug you have.

## 10. Anti-patterns

- Snapshot tests of whole screens asserting nothing
- Mocking `Dispatchers` instead of injecting them
- `Thread.sleep` in tests
- Testing implementation details (internal state, call counts on collaborators)
- Mocking so heavily the test only proves the mock works
- No migration tests
- Only happy paths
- E2E for what a unit test covers faster
- Chasing a coverage number

## 11. Checklist

- [ ] Money maths unit-tested including edge values
- [ ] Every Room migration tested, plus the full chain from v1
- [ ] Timeout/idempotency behaviour tested — no double submission
- [ ] Every error branch has a test
- [ ] ViewModel covers all four UI states plus cache-on-error
- [ ] Compose tests query by semantics
- [ ] Screenshot tests for light, dark, 2.0× font, small width
- [ ] Workers proven idempotent
- [ ] Awkward fixture data used, not idealised data
- [ ] Lint, tests and migration tests enforced in CI
