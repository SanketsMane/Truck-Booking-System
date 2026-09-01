# Implementation checklist

The gate between "it compiles" and "this is production-ready". Anything unticked is remaining work, not a caveat.

## 0. Before writing code

- [ ] Requirement stated in one sentence, with the user-visible behaviour
- [ ] Failure modes enumerated: offline, slow, timeout, process death, permission denied, token expired, job never runs
- [ ] Layer placement and data flow decided -> `architecture.md`
- [ ] Error model designed — every failure the caller must distinguish
- [ ] Project inspected; existing patterns identified -> `project-setup.md`
- [ ] Green baseline confirmed (`assembleDebug`, tests, lint all pass today)
- [ ] No new dependency, or one justified in a sentence

## 1. Architecture

- [ ] One responsibility per layer; dependencies point inward
- [ ] No `android.*` in domain/repository logic; no `Context` in a ViewModel
- [ ] DTO / Entity / domain models separate, with explicit mapping
- [ ] One immutable `UiState` per screen as `StateFlow`, `WhileSubscribed(5_000)`
- [ ] One-shot events on a `Channel`, not in state
- [ ] Follows the project's existing pattern, not a second one

## 2. Concurrency

- [ ] No `GlobalScope`; every scope has an owner
- [ ] Dispatchers injected, not hardcoded; suspend functions main-safe
- [ ] `CancellationException` rethrown wherever exceptions are caught
- [ ] No `catch (e: Exception) {}`; no log-and-return-null
- [ ] Flows collected lifecycle-aware
- [ ] `callbackFlow` unregisters in `awaitClose`
- [ ] Cancellation path covered by a test -> `kotlin-and-concurrency.md`

## 3. Data

- [ ] DB is the single source of truth; UI observes a Flow
- [ ] Money as integer minor units + currency; never `Double`
- [ ] Indices on every filtered/sorted/joined column
- [ ] Migration written, schema exported and committed
- [ ] **Migration tested, including the chain from the currently shipped version**
- [ ] No `fallbackToDestructiveMigration` in release
- [ ] Secrets in encrypted storage, not DataStore or SharedPreferences
- [ ] Cache/staleness policy decided and surfaced in the UI -> `data-layer.md`

## 4. Networking

- [ ] Timeouts set including `callTimeout`; logging guarded by `BuildConfig.DEBUG`
- [ ] `ignoreUnknownKeys = true`; DTOs permissive
- [ ] Errors typed; error bodies parsed so the UI can distinguish causes
- [ ] **Timeout on a state-changing call polls status — never reports "Failed"**
- [ ] Idempotency key generated once, persisted, reused on retry
- [ ] Retry distinguishes transient from terminal; backoff with a cap
- [ ] Token refresh serialised and loop-guarded -> `networking.md`

## 5. Lifecycle

- [ ] Verified with "Don't keep activities" and `adb shell am kill`
- [ ] User input survives process death
- [ ] Nothing large or sensitive in `SavedStateHandle`
- [ ] Rotation and font-scale change verified on every input screen
- [ ] Work that must complete is not in `viewModelScope`
- [ ] LeakCanary clean -> `state-and-lifecycle.md`

## 6. Background

- [ ] Primitive matches the guarantee needed
- [ ] Unique work names; workers idempotent and proven so by test
- [ ] Constraints and capped backoff set
- [ ] Foreground services declare a type and start within 5 s
- [ ] Verified under forced Doze and the `rare` standby bucket -> `background-work.md`

## 7. Platform integration

- [ ] Permissions requested in context; all three outcomes handled -> `permissions-and-privacy.md`
- [ ] `<queries>` declared for every external app resolved
- [ ] Notification channels split by category; token deleted on sign-out -> `push-notifications.md`
- [ ] Deep links verified; back stack synthesised; parameters validated -> `deep-links.md`
- [ ] Everything `exported="false"` unless required; exported input validated

## 8. Security

- [ ] Tokens/keys in EncryptedSharedPreferences or Keystore
- [ ] Biometric keys invalidated on new enrolment; `BIOMETRIC_STRONG` for payments
- [ ] Cleartext disabled; user CAs untrusted in release
- [ ] No secret shipped in the APK
- [ ] `FLAG_SECURE` on PIN/card screens; app-switcher snapshot obscured
- [ ] `FLAG_IMMUTABLE` on every PendingIntent
- [ ] No PII in logs, crash reports or analytics -> `security.md`

## 9. Payments (when applicable)

- [ ] Correct rail (Play Billing vs PSP) for what is sold
- [ ] Server is the source of truth; no client-side entitlement
- [ ] Idempotency key + disabled CTA make double-submit impossible
- [ ] `Unknown` state implemented; timeout polls status
- [ ] Pending payment survives process death and reconciles on launch
- [ ] No card/CVV/PIN stored -> `payments.md`

## 10. Build

- [ ] Version catalog used; no literal versions
- [ ] KSP not KAPT
- [ ] Signing from environment; keystore not committed
- [ ] **Release build with R8 built, installed and exercised**
- [ ] `mapping.txt` uploaded
- [ ] `compileSdk`/`targetSdk` current -> `build-and-gradle.md`

## 11. Tests

- [ ] Money maths unit-tested including edge values
- [ ] Every error branch tested
- [ ] Migration tests present and passing
- [ ] Timeout/idempotency behaviour tested — no double charge
- [ ] ViewModel covers loading, content, empty, error
- [ ] Workers proven idempotent
- [ ] Awkward fixture data used -> `testing.md`

## 12. Performance and observability

- [ ] StrictMode clean in debug; no main-thread I/O
- [ ] Measured on a low-end device with a release build
- [ ] Baseline profile current if startup/navigation changed
- [ ] Crash reporting attributes this code correctly; breadcrumbs added
- [ ] Feature flag or kill switch for anything risky -> `performance.md`, `observability.md`

## 13. Verification

- [ ] Built **and run** on a device -> `../../mobile-product-engineer/references/running-the-app.md`
- [ ] Every Phase 1 failure mode actually exercised — network genuinely off, process genuinely killed
- [ ] Offline path works or degrades explicitly
- [ ] Lint, detekt and tests pass
- [ ] Release build verified, not just debug

## 14. Reporting

State plainly:
- What you built, and the key engineering decisions in one line each
- What you reused from the project
- Any dependency added and why
- **What you verified, and how** (device, states, failure modes exercised)
- **What you could not verify**, and why
- Anything left out, and why

Never say "done" while a box above is unticked. If something is blocked, finish everything else and say exactly what remains.
