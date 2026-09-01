# Observability

You cannot fix what you cannot see. A crash you cannot symbolicate, or an ANR with no context, is a bug you will ship again.

## 1. The minimum

| Signal | Tool | Non-negotiable because |
| --- | --- | --- |
| Crashes | Crashlytics (or Sentry) | Otherwise you learn about breakage from store reviews |
| ANRs | Play vitals + Crashlytics | Play suppresses ranking above 0.47% |
| Startup / jank | Play vitals, Macrobenchmark | Regressions are invisible locally |
| Key funnels | Analytics | "Did the release break sign-up?" must be answerable in minutes |
| Logs | Timber + a release tree | Crash reports without breadcrumbs are guesswork |

## 2. Crash reporting

```kotlin
FirebaseCrashlytics.getInstance().apply {
    setUserId(hashedUserId)          // hashed/pseudonymous, never an email or phone
    setCustomKey("screen", "wallet")
    setCustomKey("build_flavor", BuildConfig.FLAVOR)
}
```

- **Upload `mapping.txt`** on every release or every stack trace is unreadable obfuscated noise. Wire it into the release build, not a manual step. -> `build-and-gradle.md`
- Add breadcrumbs at meaningful transitions (screen entered, request started, payment submitted) so a crash has a story.
- Log **handled** exceptions too (`recordException`) — the error branches you handled gracefully still tell you what is failing in production.
- Never attach PII: no email, phone, account number, balance, token or full name. Use a hashed id. -> `permissions-and-privacy.md`
- Set a **custom key for the current screen** — it is the single most useful field when triaging.

## 3. ANR diagnosis

- Play Console → Android vitals → ANRs gives clustered stacks with the main thread at the moment of the block.
- Read the **main thread** frame, not the top of the trace.
- `ApplicationExitInfo` (API 30+) lets you retrieve the reason for the last process death — ANR, OOM, user kill, system kill — on next launch and report it:

```kotlin
activityManager.getHistoricalProcessExitReasons(packageName, 0, 5).firstOrNull()?.let {
    crashlytics.setCustomKey("last_exit_reason", it.reason)
}
```

This is how you discover background OOM kills that never produce a crash report.

## 4. Logging

```kotlin
if (BuildConfig.DEBUG) Timber.plant(Timber.DebugTree())
else Timber.plant(CrashlyticsTree())   // forwards WARN/ERROR, scrubs PII, drops VERBOSE/DEBUG
```

Rules:
- No `Log.d` littering release builds — logcat is readable in bug reports and by some tooling.
- **Never log**: tokens, PINs, OTPs, card or account numbers, balances, request/response bodies. Scrub at the tree so it cannot be forgotten at a call site. -> `security.md`
- Log **decisions and transitions**, not values: "refresh failed, retrying (attempt 2)" beats dumping the response.
- Structured keys over string concatenation.

## 5. Analytics

- Instrument the funnels that matter: onboarding, KYC completion, payment start → success, and every drop-off point in a money flow.
- Log the **step**, not the amount. Never send financial values or identifiers to a third-party analytics SDK.
- One naming convention, documented, enforced in review — inconsistent event names make the data useless within a quarter.
- Every analytics SDK you add is a Data Safety declaration obligation. -> `permissions-and-privacy.md` §6
- Respect consent where required; do not initialise trackers before consent.

## 6. Performance tracing

```kotlin
trace("wallet_load") {          // androidx.tracing
    val data = repository.load()
}
```

- Firebase Performance or custom traces for: app start, screen render, key network calls.
- Perfetto for deep frame analysis. -> `performance.md`
- Trace spans should mirror user-visible operations, not internal function boundaries.

## 7. Feature flags and kill switches

The most valuable production tool there is.

- Remote config (Firebase Remote Config, or your own endpoint) for risky features, default **off**.
- A server-side kill switch for anything touching payments — you can disable a broken flow in minutes instead of days waiting on a Play release. -> `release-and-play-store.md` §7
- A "minimum supported version" check so you can force-upgrade clients with a broken protocol.
- Flags must fail **safe**: if config cannot be fetched, fall back to the last known good value, then to a safe default.

## 8. Watching a release

After each staged-rollout increase, check:

- [ ] Crash-free sessions vs the previous version
- [ ] ANR rate vs the previous version
- [ ] Cold start and jank in vitals
- [ ] Payment success rate and key funnel conversion
- [ ] New crash clusters (not just total count — a new cluster at low volume can be the serious one)
- [ ] Backend error rates from this client version

Halt on regression; do not roll forward hoping.

## 9. Anti-patterns

- No `mapping.txt` upload
- PII in crash reports or analytics
- Only unhandled crashes tracked; handled errors invisible
- `Log.d` everywhere in release
- Logging request/response bodies
- No screen breadcrumb on crash reports
- Analytics event names invented ad hoc
- No kill switch on a payment feature
- Flags that fail closed and brick the app when config is unreachable
- Shipping to 100% without watching vitals

## 10. Checklist

- [ ] Crash reporting live; `mapping.txt` uploaded automatically per release
- [ ] Hashed user id, screen key and breadcrumbs attached
- [ ] Handled exceptions recorded, not just crashes
- [ ] `ApplicationExitInfo` reported on next launch
- [ ] Release logging tree scrubs PII; no bodies logged
- [ ] Key funnels instrumented, no financial values sent
- [ ] Analytics SDKs reflected in the Data Safety form
- [ ] Feature flags and a payment kill switch in place, failing safe
- [ ] Vitals baseline recorded before rollout, watched at each increase
