# CI/CD

CI exists to make the checks non-optional. If a gate can be skipped, it will be.

## 1. Pipeline shape

```
PR:      lint → unit tests → assemble debug → (screenshot tests)      ~5-10 min
main:    everything above → instrumentation tests → assemble release   ~20-30 min
tag:     bundle → sign → upload to internal track
```

Keep the PR path fast. A 40-minute PR check gets bypassed, and then it protects nothing.

## 2. GitHub Actions

```yaml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: gradle/actions/setup-gradle@v4    # handles Gradle caching
      - run: ./gradlew lintDebug detekt
      - run: ./gradlew testDebugUnitTest
      - run: ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: reports, path: '**/build/reports/**' }
```

- JDK 17 for AGP 8+.
- Cache Gradle — otherwise every run redownloads the world.
- **Always upload reports on failure.** A red build with no artifacts wastes everyone's time.
- `--no-daemon` on CI; the daemon has nothing to reuse in a fresh container.

## 3. Instrumentation tests

Emulators on CI are slow and flaky. Options, best first:

| Option | Notes |
| --- | --- |
| **Gradle Managed Devices** | Declared in Gradle, reproducible, headless (`aosp-atd` images are fastest) |
| **Firebase Test Lab** | Real devices, matrix across API levels, costs money |
| `reactivecircus/android-emulator-runner` | Works, slower, needs KVM |

```kotlin
testOptions {
    managedDevices.devices {
        create<ManagedVirtualDevice>("pixel6api34") {
            device = "Pixel 6"; apiLevel = 34; systemImageSource = "aosp-atd"
        }
    }
}
```
`./gradlew pixel6api34DebugAndroidTest`

Run these on `main`, not on every PR, unless they are fast.

## 4. Secrets

- **Never** commit a keystore, `google-services.json` for production, or any API key.
- GitHub Secrets / your CI's secret store → environment variables → Gradle. -> `build-and-gradle.md` §3
- Base64-encode the keystore into a secret and decode it at build time:

```yaml
- run: echo "${{ secrets.KEYSTORE_B64 }}" | base64 -d > keystore.jks
```
- Never `echo` a secret. Mask them in logs.
- Rotate on any suspected exposure, and treat a leaked upload key as an incident.

## 5. Fastlane (optional)

Useful when release steps are numerous or shared with iOS.

```ruby
lane :internal do
  gradle(task: "bundle", build_type: "Release")
  upload_to_play_store(track: "internal", aab: "...")
end
```

`supply` uploads bundles, listings and staged rollout percentages. Use a service account JSON stored as a secret with the narrowest Play Console role that works.

If your release is "build, sign, upload to internal", a 15-line GitHub Actions job is simpler than adopting Fastlane — do not add the dependency for its own sake.

## 6. Gates worth enforcing

| Gate | Why |
| --- | --- |
| Lint / detekt / ktlint | Style and correctness drift, cheaply caught |
| Unit tests | Regression protection |
| Room migration tests | Data loss is unrecoverable -> `data-layer.md` |
| Compose compiler metrics diff | Catches new non-skippable composables |
| APK/AAB size check | Size creeps silently; fail on a threshold increase |
| Dependency vulnerability scan | Known CVEs in transitive deps |
| Screenshot tests | Unintended visual regressions -> `testing.md` |

Fail the build on regressions, do not just warn — a warning nobody reads is not a gate.

## 7. Versioning in CI

```kotlin
versionCode = (System.getenv("GITHUB_RUN_NUMBER")?.toInt() ?: 1) + BASE
```

Monotonic and automatic beats hand-edited. -> `release-and-play-store.md` §1

## 8. Anti-patterns

- Slow PR pipeline that people learn to bypass
- Secrets in the repository
- No artifact upload on failure
- Instrumentation tests on every PR, flaking constantly
- Gates that warn instead of failing
- Hand-edited `versionCode`
- Building release without testing release
- Adopting Fastlane for a three-step release

## 9. Checklist

- [ ] PR pipeline under ~10 minutes
- [ ] Lint, unit tests, and a debug build gate every PR
- [ ] Reports uploaded on failure
- [ ] Migration tests in CI
- [ ] Instrumentation tests on `main` via managed devices or Test Lab
- [ ] All secrets from the secret store; keystore never committed
- [ ] `versionCode` derived automatically
- [ ] Release build produced and smoke-tested by CI
- [ ] Size and dependency-vulnerability checks enforced
