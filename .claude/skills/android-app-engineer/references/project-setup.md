# Project setup

Joining an existing Android codebase is research before it is engineering. The project's conventions outrank this skill's defaults.

## 1. Reconnaissance

```bash
# Build system and versions
cat gradle/libs.versions.toml 2>/dev/null | head -60
cat settings.gradle.kts build.gradle.kts app/build.gradle.kts 2>/dev/null
cat gradle.properties
cat gradle/wrapper/gradle-wrapper.properties      # Gradle version
java -version                                     # must be 17+ for AGP 8+

# Shape of the app
ls app/src/main/java/**/ 2>/dev/null | head -40
cat app/src/main/AndroidManifest.xml
find . -name "*.kt" | wc -l
ls */build.gradle.kts 2>/dev/null                 # multi-module?
```

Then **read one complete feature end to end** — a screen, its ViewModel, its repository, its DAO and its API interface. That tells you more about the real conventions than any config file.

## 2. What to determine

| Question | Where to look |
| --- | --- |
| Compose, XML views, or both? | `buildFeatures { compose = true }`, `@Composable` count vs `layout/*.xml` |
| minSdk / targetSdk / compileSdk | `app/build.gradle.kts` |
| DI framework | `@HiltAndroidApp`, Koin `startKoin`, or manual |
| Architecture pattern | ViewModel shape: `StateFlow<UiState>` vs `LiveData` vs MVI intents |
| Networking | Retrofit, Ktor, or something bespoke |
| Serialization | kotlinx.serialization, Moshi, Gson |
| Persistence | Room, SQLDelight, Realm, raw SQLite, SharedPreferences |
| Async | Coroutines/Flow, RxJava, callbacks, or a mix |
| Navigation | Navigation Compose, Fragments + nav graph, custom |
| Background | WorkManager, JobScheduler, services, `AsyncTask` (legacy) |
| Image loading | Coil, Glide, Picasso |
| Modularisation | single `:app` or `:core`/`:feature` |
| Testing | JUnit4/5, MockK vs Mockito, Turbine, Robolectric, Espresso |
| Static analysis | detekt, ktlint, Android Lint config |
| CI | `.github/workflows/`, `fastlane/`, Bitrise/CircleCI config |
| Crash/analytics | `google-services.json`, Crashlytics, Sentry |
| Flavors | `productFlavors` block |
| Signing | `signingConfigs`, whether secrets come from env |

Write the answers down before designing. Phase 2 decisions change completely depending on whether the project is coroutines or RxJava.

## 3. The reuse ladder

Resolve every need in this order, stopping at the first that works:

1. **An existing class or pattern** in this project — use it, even if you would have written it differently.
2. **Extend it** additively, preserving existing behaviour and signatures.
3. **A new class following the project's existing conventions.**
4. **A new dependency** — only after §5.

Two DI frameworks, two HTTP clients, or RxJava and coroutines side by side is a permanent tax. Never introduce the second one to build one feature.

## 4. Working with what exists

| Situation | Do |
| --- | --- |
| Clean architecture already in place | Follow it exactly, including naming |
| Partial architecture (some repos, some direct API calls in ViewModels) | Follow the **better** existing pattern; do not invent a third |
| Legacy: `AsyncTask`, `LiveData`, Fragments, XML | Work within it. Do **not** migrate uninvited — say a migration is available as separate work |
| RxJava codebase | Write Rx, or use `kotlinx-coroutines-rx3` interop at a clear boundary. Do not scatter both |
| No architecture at all | Introduce the minimum structure for your feature; propose a broader plan, do not unilaterally refactor |
| Their conventions conflict with this skill | **Theirs win.** Consistency inside the app beats correctness in the abstract |

Say once, in a line, where you diverged from this skill's defaults and why. Do not fight the codebase.

## 5. Adding a dependency

1. **Does the project already solve this?** Read `libs.versions.toml` first. Adding Moshi to a kotlinx.serialization project is a defect.
2. **Can an existing dependency do it?** OkHttp does far more than most people use.
3. **Is it trivial?** Write the 40 lines rather than adding a library for a debounce or a formatter.
4. **If genuinely needed**, judge: maintained (commits in the last 6 months), size impact, transitive weight, R8 rules provided, Kotlin/coroutines-native, licence compatibility, and whether it demands a `targetSdk` or `minSdk` change.
5. **Check the privacy consequence** — any SDK that collects data changes your Data Safety declaration. -> `permissions-and-privacy.md`
6. **Tell the user** what you added and why nothing existing sufficed.

## 6. Before you change anything

```bash
./gradlew assembleDebug          # does it even build today?
./gradlew testDebugUnitTest      # do the tests pass today?
./gradlew lintDebug detekt
git log --oneline -20            # what has been happening
git log --oneline -- <file>      # history of the file you are about to change
```

Establish a green baseline first. Otherwise you cannot tell whether you broke it. If it is already red, say so before starting — do not silently inherit someone else's failure.

## 7. Preserve what works

- Do not rewrite working architecture for elegance.
- Do not reformat files you did not otherwise change — it buries the real diff.
- Do not upgrade Gradle, AGP, Kotlin or a major dependency as a side effect of a feature.
- Do not change `minSdk`/`targetSdk` without asking. -> `release-and-play-store.md`
- Match surrounding naming, package layout, import ordering and comment density.
- Keep public signatures stable; additions are additive.
- If you find a real bug next to your work, mention it; fix it only if it blocks you or the user agrees.

## 8. Reporting back

State briefly:
- What existing patterns, classes and modules you reused.
- What you added, and why nothing existing sufficed.
- Any dependency added, with its size and privacy consequence.
- Any inconsistency or bug you found and deliberately left alone.
- Anything you could not verify (no device, no credentials, no backend).
