# Performance

*Android/Kotlin runtime performance. React Native performance is in
`../../mobile-product-engineer/references/performance.md`; Compose recomposition and lazy lists are in
`../../mobile-product-engineer/references/compose-performance.md`.*

Measure on a **release build**, on the **worst device you support**. Everything else is guesswork.

## 1. Targets

```
cold start (TTID)        < 1.5 s     time to initial display
cold start (TTFD)        < 2.5 s     time to full display (real content)
warm start               < 700 ms
frame time               < 16.7 ms   (< 8.3 ms on 120 Hz)
ANR rate                 < 0.47%     Play's bad-behaviour threshold
crash-free sessions      > 99.5%
```

Play's Android vitals enforces the ANR and crash thresholds — exceeding them suppresses your store ranking. These are business numbers, not engineering vanity.

## 2. Startup

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        splash.setKeepOnScreenCondition { viewModel.isInitialising.value }
        super.onCreate(savedInstanceState)
    }
}
```

- **Nothing blocking in `Application.onCreate`.** No disk reads, no network, no eager DI graph construction, no SDK init that touches I/O.
- Use `androidx.startup` with explicit dependencies rather than a pile of `onCreate` calls.
- Defer analytics, remote config, and non-critical SDKs until after first frame.
- **Never gate the splash on a network call** — show the UI with skeletons instead. -> `../../mobile-product-engineer/references/loading-states.md`
- Report `reportFullyDrawn()` so TTFD is measured correctly.

Measure:
```bash
adb shell am start -W -n <pkg>/.MainActivity          # TotalTime
adb shell dumpsys gfxinfo <pkg> framestats
```

## 3. Baseline profiles

The highest-leverage single change available. AOT-compiles hot startup and scroll paths; typically 20–30% faster cold start and no first-scroll jank.

```kotlin
plugins { id("androidx.baselineprofile") }
dependencies { baselineProfile(project(":benchmark")) }
```

Write a generator that exercises startup plus your two or three most-scrolled screens, run it on a rooted emulator or physical device, and commit the generated profile. Regenerate when startup or navigation changes materially. -> `../../mobile-product-engineer/references/compose-performance.md` §7

## 4. ANRs

An ANR is 5 seconds of blocked main thread (or ~10s for a broadcast, ~20s for a service start). Causes, in order of frequency:

1. Disk or network I/O on the main thread
2. `runBlocking` on the main thread
3. Synchronous `SharedPreferences.commit()` (use `apply()`, or DataStore)
4. Heavy work in `BroadcastReceiver.onReceive` (~10 s budget)
5. Foreground service not calling `startForeground()` within 5 s -> `background-work.md`
6. Deadlocks and lock contention
7. Binder calls to a slow ContentProvider

Catch them in development:

```kotlin
if (BuildConfig.DEBUG) {
    StrictMode.setThreadPolicy(StrictMode.ThreadPolicy.Builder()
        .detectDiskReads().detectDiskWrites().detectNetwork().penaltyLog().build())
    StrictMode.setVmPolicy(StrictMode.VmPolicy.Builder()
        .detectLeakedClosableObjects().detectActivityLeaks().penaltyLog().build())
}
```

Ship with StrictMode clean. In production, read ANR clusters in Play Console vitals and Crashlytics — the stack shows the main thread at the moment of the block. -> `observability.md`

## 5. Jank

- Compose-specific causes (recomposition, unkeyed lazy lists, stability) are in `../../mobile-product-engineer/references/compose-performance.md`.
- Never do I/O, parsing or formatting during scroll — precompute when data enters the ViewModel.
- Avoid overdraw: no stacked opaque backgrounds. Check with Developer options → Debug GPU overdraw.
- Bitmap decoding off the main thread; size images to their display size.

Measure with Macrobenchmark:

```kotlin
@Test fun scrollTransactions() = benchmarkRule.measureRepeated(
    packageName = PKG,
    metrics = listOf(FrameTimingMetric()),
    compilationMode = CompilationMode.Partial(),   // matches a real install with a baseline profile
    startupMode = StartupMode.COLD,
) { startActivityAndWait(); scrollList() }
```

## 6. Memory

- Leaks: LeakCanary in debug. A leaked Activity is a real OOM on a 2 GB device.
- Bitmaps dominate memory — size correctly, use an image loader with a bounded cache.
- `onTrimMemory` to release caches under pressure.
- Watch for large objects held in singletons or long-lived closures.
- Profile with Android Studio Memory Profiler; look for a sawtooth that never returns to baseline.

## 7. App size

- App Bundle is required and gives per-device APKs. -> `build-and-gradle.md`
- `isShrinkResources = true` with minify.
- WebP/vector over PNG.
- APK Analyzer to find what actually grew; audit transitive dependencies.
- Enforce a size budget in CI so growth is a conversation, not a surprise. -> `ci-cd.md`

Size matters commercially: install conversion drops measurably as size grows, especially on slow networks.

## 8. Battery and network

- Batch and constrain background work; never poll when push exists. -> `background-work.md`, `push-notifications.md`
- Request only the fields you need; paginate.
- Stale-while-revalidate so screens render from cache instantly. -> `data-layer.md`
- Test under Doze and in the `rare` standby bucket.
- Battery Historian or Play Console's excessive-wakeup vitals for regressions.

## 9. Measuring, in order

1. Reproduce on a **low-end physical device**, release build.
2. Macrobenchmark for startup and scroll numbers.
3. Perfetto/systrace to see where a slow frame went.
4. Change **one** thing.
5. Re-measure.

Never optimise from intuition, never benchmark a debug build, never conclude from a flagship device.

## 10. Anti-patterns

- Benchmarking debug builds
- Optimising without measuring
- Blocking work in `Application.onCreate`
- Splash gated on network
- `runBlocking` on main
- `SharedPreferences.commit()` on main
- Formatting/parsing during scroll
- No baseline profile
- Ignoring Play vitals until ranking drops
- Testing only on a flagship

## 11. Checklist

- [ ] Measured on a low-end device, release build
- [ ] Cold start under target; nothing blocking before first frame
- [ ] Baseline profile generated and shipped
- [ ] StrictMode clean in debug
- [ ] No main-thread I/O anywhere
- [ ] Long lists scroll at 60 fps with no blank frames
- [ ] LeakCanary clean on touched screens
- [ ] App size budget checked in CI
- [ ] Play vitals (ANR, crash-free) within thresholds before rollout increases
