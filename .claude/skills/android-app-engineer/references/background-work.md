# Background work

Pick the primitive that matches the **guarantee** you need. Most background bugs are the wrong primitive, not a broken implementation.

## 1. Choosing

| Requirement | Primitive |
| --- | --- |
| Must complete eventually, survives process death and reboot | **WorkManager** |
| User-visible and ongoing (navigation, playback, active upload, call) | **Foreground service** with a declared type |
| Must fire at an exact wall-clock time (alarm, medication reminder) | **AlarmManager** + `SCHEDULE_EXACT_ALARM` |
| Only while the screen is open | coroutine in `viewModelScope` |
| Server-initiated | **FCM** -> `push-notifications.md` |
| Short task while app is foreground | coroutine in an injected scope |

If the work is deferrable, use WorkManager. A foreground service for deferrable work drains battery, annoys users with a persistent notification, and risks Play policy rejection.

## 2. WorkManager

```kotlin
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted ctx: Context,
    @Assisted params: WorkerParameters,
    private val repo: TransactionRepository,
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result = when (val r = repo.sync()) {
        is DataResult.Success -> Result.success()
        is DataResult.Failure -> if (r.error.isTransient && runAttemptCount < 5)
            Result.retry() else Result.failure()
    }
}

val request = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
    .setConstraints(Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build())
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
    .build()

WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
    "sync", ExistingPeriodicWorkPolicy.KEEP, request,
)
```

Rules:
- **`enqueueUnique…` with a stable name**, always. Without it, every app launch enqueues another copy and you end up with dozens of duplicate periodic jobs.
- `CoroutineWorker`, not `Worker` — you get suspension and cooperative cancellation.
- Minimum periodic interval is **15 minutes**; anything shorter is silently clamped.
- `Result.retry()` only for transient failures, and cap with `runAttemptCount`. Infinite retry on a permanent failure burns battery forever.
- Workers must be **idempotent** — they will run more than once.
- Chain with `beginWith().then()` when order matters.
- `setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)` for urgent work, within quota.
- Inject dependencies via `@HiltWorker` + `HiltWorkerFactory`; a worker constructing its own dependencies is untestable.

**Do not** use WorkManager for: anything the user is waiting on right now, anything needing exact timing, or anything that must run while the app is dead **and** immediately.

## 3. Foreground services

Since Android 14, every foreground service must declare a **type**, and each type has prerequisites Play reviews.

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<service android:name=".UploadService"
         android:foregroundServiceType="dataSync"
         android:exported="false" />
```

```kotlin
ServiceCompat.startForeground(
    this, NOTIF_ID, notification,
    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
)
```

- Call `startForeground()` within ~5 seconds of starting, or the system throws `ForegroundServiceDidNotStartInTimeException`.
- Android 12+ **blocks** starting a foreground service from the background, with narrow exemptions. Use an expedited `WorkManager` job instead.
- `dataSync` has a runtime budget on Android 15 — long syncs must be WorkManager.
- The notification must be honest about what is happening and offer a stop action.

## 4. Exact alarms

```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />  <!-- or USE_EXACT_ALARM -->
```

- Android 12+ requires the permission; Android 13+ it may be revoked. Check `canScheduleExactAlarms()` before every schedule and route to `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` if denied.
- Play restricts `USE_EXACT_ALARM` to alarm-clock and calendar apps. A payment reminder does not qualify — use `setWindow` or WorkManager.
- Alarms do not survive reboot: re-register in a `BOOT_COMPLETED` receiver.

## 5. Doze and App Standby

When the device is idle, network access and jobs are deferred into maintenance windows; alarms are batched.

- Test it: `adb shell dumpsys deviceidle force-idle`, then `adb shell dumpsys deviceidle unforce`.
- Test standby buckets: `adb shell am set-standby-bucket <pkg> rare`.
- **Never** ask the user to disable battery optimisation unless the app genuinely cannot function otherwise — Play requires justification and users distrust the prompt.
- Time-critical, server-initiated work belongs in a high-priority FCM message, not a polling job. -> `push-notifications.md`

## 6. Boot and process restarts

```xml
<receiver android:name=".BootReceiver" android:exported="false">
    <intent-filter><action android:name="android.intent.action.BOOT_COMPLETED" /></intent-filter>
</receiver>
```

- Requires `RECEIVE_BOOT_COMPLETED`.
- Re-register alarms; WorkManager restores its own jobs automatically.
- Do minimal work in the receiver — enqueue a worker and return. A receiver has ~10 seconds before ANR.
- The receiver does not fire until the user unlocks the device on encrypted devices (unless you use direct-boot aware components).

## 7. Battery and correctness

- Batch work; do not schedule ten jobs that could be one.
- Constrain on network and battery so jobs do not run at 3% on cellular.
- Back off exponentially; cap attempts.
- Cancel obsolete work: `cancelUniqueWork`, or replace with `ExistingWorkPolicy.REPLACE`.
- Observe results with `getWorkInfoByIdFlow` to drive UI, rather than polling.

## 8. Testing

```kotlin
@Test fun syncWorker_retriesOnTransientFailure() = runTest {
    val worker = TestListenableWorkerBuilder<SyncWorker>(context)
        .setWorkerFactory(testFactory).build()
    assertEquals(ListenableWorker.Result.retry(), worker.doWork())
}
```

- `TestListenableWorkerBuilder` for logic; `WorkManagerTestInitHelper` for scheduling and constraints.
- Test the idempotency of every worker — run `doWork()` twice and assert no duplicate side effect.
- Force conditions on device: `adb shell cmd jobscheduler run -f <pkg> <jobId>`.

## 9. Anti-patterns

- `enqueue` without a unique name for periodic work
- Foreground service for deferrable work
- Missing `foregroundServiceType` (Android 14+ crash)
- Exact alarms for non-alarm features
- Unbounded `Result.retry()`
- Non-idempotent workers
- Heavy work inside a `BroadcastReceiver`
- Polling instead of a push message
- Asking users to disable battery optimisation as a first resort
- Assuming a periodic worker runs exactly on schedule

## 10. Checklist

- [ ] Primitive matches the guarantee actually required
- [ ] Unique work names for all periodic and one-off-by-identity work
- [ ] Workers idempotent, and tested by running twice
- [ ] Constraints set (network, battery); exponential backoff with a cap
- [ ] Foreground services declare a type and start within 5 s
- [ ] Exact alarms permission-checked and re-registered after boot
- [ ] Verified under forced Doze and in the `rare` standby bucket
- [ ] Work cancelled when it becomes obsolete
- [ ] Dependencies injected; workers unit-tested
