# Running and screenshotting the app

Phase 6 requires you to **look at** what you built. This file is how you get there, and what to do when the build fights you. If you cannot get a device up, say so explicitly rather than implying visual verification you did not perform.

## 1. Decide what you are running

```bash
ls android ios 2>/dev/null            # bare native projects present?
cat package.json 2>/dev/null | head -40
ls settings.gradle settings.gradle.kts 2>/dev/null   # native Android project
ls *.xcodeproj *.xcworkspace 2>/dev/null             # native iOS project
cat app.json app.config.* 2>/dev/null | head -20     # Expo
```

| Signals | Project type | Run with |
| --- | --- | --- |
| `app.json` with `expo`, no `android/` | Expo managed | `npx expo start` |
| `expo` deps **and** `android/` | Expo dev client / prebuild | `npx expo run:android` |
| `package.json` + `android/`, no expo | React Native CLI | `npx react-native run-android` |
| `settings.gradle.kts`, no `package.json` | Native Android | `./gradlew installDebug` |
| `.xcworkspace`, no `package.json` | Native iOS | `xcodebuild` / Xcode |

## 2. Android emulator

```bash
# Is the SDK reachable?
echo "$ANDROID_HOME" ; ls "$ANDROID_HOME/emulator" 2>/dev/null

# List and boot
"$ANDROID_HOME/emulator/emulator" -list-avds
"$ANDROID_HOME/emulator/emulator" -avd <name> -no-snapshot-load &

# Wait until it is genuinely ready (not just "device" state)
adb wait-for-device
adb shell 'while [[ "$(getprop sys.boot_completed)" != "1" ]]; do sleep 1; done'
adb devices
```

If no AVD exists:

```bash
sdkmanager "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd -n test35 -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7
```

A physical device works too: enable USB debugging, `adb devices`, accept the prompt.

## 3. iOS simulator

```bash
xcrun simctl list devices available
xcrun simctl boot "iPhone 15"
open -a Simulator
xcrun simctl bootstatus "iPhone 15" -b     # blocks until booted
```

## 4. Build and install

**Expo managed** — fastest path, no native build:
```bash
npx expo start --clear
# then press 'a' (Android) or 'i' (iOS), or:
npx expo start --android
```

**Expo dev client / RN CLI:**
```bash
npx expo run:android            # or: npx react-native run-android
npx expo run:ios                # or: npx react-native run-ios
```

**Native Android:**
```bash
./gradlew :app:installDebug
adb shell monkey -p <applicationId> -c android.intent.category.LAUNCHER 1
# or explicitly:
adb shell am start -n <applicationId>/.MainActivity
```

**Never** run a release build for visual QA — it hides dev warnings, and Compose debug/release behaviour differs. Use debug for looking, release only for measuring performance (`compose-performance.md` §6).

## 5. Screenshots — and actually look at them

```bash
# Android
adb exec-out screencap -p > /tmp/shot.png

# iOS
xcrun simctl io booted screenshot /tmp/shot.png

# Android video, for animation/gesture review
adb shell screenrecord --time-limit 15 /sdcard/rec.mp4 && adb pull /sdcard/rec.mp4 /tmp/
```

Then **read the PNG back with the Read tool and inspect it**. A screenshot you captured but did not view proves nothing and must not be reported as verification.

Capture, at minimum: default, loading, empty, error, dark mode, and largest font scale.

## 6. Forcing the states you must verify

```bash
# Dark mode
adb shell "cmd uimode night yes"      # and: night no
xcrun simctl ui booted appearance dark

# Font scale (2.0x = the accessibility case)
adb shell settings put system font_scale 2.0     # reset with 1.0
xcrun simctl ui booted content_size accessibility-extra-large

# Offline / error states
adb shell svc wifi disable ; adb shell svc data disable
xcrun simctl status_bar booted override cellularMode notSupported

# Navigation mode (both must be tested — different bottom insets)
adb shell cmd overlay enable com.android.internal.systemui.navbar.gestural
adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton

# Reduced motion
adb shell settings put global animator_duration_scale 0.0    # reset with 1.0

# Talkback / screen reader
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
```

Empty and error states usually need a code-level switch — a debug flag, a mocked repository, or a `@Preview` per state. Building that switch is part of the work, not a detour.

## 7. Compose previews as cheap visual QA

When no emulator is available, `@Preview` still gives you real rendering:

```kotlin
@Preview(name = "Default")
@Preview(name = "Dark", uiMode = UI_MODE_NIGHT_YES)
@Preview(name = "Large font", fontScale = 2.0f)
@Preview(name = "Small screen", device = "spec:width=320dp,height=568dp")
@Composable private fun WalletPreview() { AppTheme { WalletScreen(state = sample) } }
```

Render them to files in CI with Paparazzi or `compose-preview-renderer`. This is the most reliable "look at it" path for a headless environment — see `../../android-app-engineer/references/testing.md`.

## 8. When the build fails

Work through these before concluding you are blocked.

| Symptom | Cause and fix |
| --- | --- |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=/Users/<you>/Library/Android/sdk` |
| `JAVA_HOME` / bad Java version | Gradle 8+ needs JDK 17; `java -version`, then set `JAVA_HOME` or `org.gradle.java.home` |
| `Could not resolve …` | Offline or proxy; retry with `--refresh-dependencies` |
| `Duplicate class …` | Two versions of a dep; `./gradlew :app:dependencies` and align via the version catalog |
| Kotlin/Compose compiler mismatch | The Compose compiler must match the Kotlin version; check the compatibility map |
| `Execution failed for task ':app:mergeDebugResources'` | Usually a malformed XML or a bad drawable — the real error is further up the log |
| Metro: `Unable to resolve module` | `npx expo start --clear`, delete `node_modules`, reinstall |
| RN: build works, screen is blank | Metro not connected — check the bundler is running and the device can reach it |
| Pod install fails (iOS) | `cd ios && pod repo update && pod install` |
| Emulator hangs at boot | `-no-snapshot-load`, or `adb emu kill` and cold boot |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Signature changed; `adb uninstall <applicationId>` first |
| Gradle daemon OOM | Raise `org.gradle.jvmargs=-Xmx4g` in `gradle.properties` |

Read the **first** error in the log, not the last — Gradle's summary is usually downstream of the real cause.

```bash
./gradlew :app:installDebug --stacktrace 2>&1 | head -60
adb logcat -c && adb logcat *:E | head -40      # runtime crashes
npx tsc --noEmit                                # RN: type errors before build errors
```

## 9. When you genuinely cannot run it

Legitimate blockers: no SDK installed, no emulator image, a native dependency that needs a paid signing identity, a headless CI box with no GPU.

In that case:

1. Do everything you can statically — type-check, lint, read the code as a reviewer, walk the checklist in `visual-qa.md`.
2. Render Compose previews or Storybook if either is available.
3. **State plainly what you did not verify and why.** For example:

> Verified: type-check and lint pass; walked the 20-point checklist statically; Compose previews rendered for default/dark/2.0× font.
> Not verified: no Android SDK on this machine, so no emulator run, no screenshots, no TalkBack pass.

Never write "looks good" about something you did not look at.

## 10. Checklist

- [ ] Project type identified before running anything
- [ ] Device/emulator genuinely booted (`boot_completed`, not just listed)
- [ ] Debug build used for visual QA
- [ ] Screenshots captured **and read back**
- [ ] Dark mode, 2.0× font, offline and both Android nav modes forced and viewed
- [ ] Loading/empty/error states actually triggered, not assumed
- [ ] Runtime log checked for errors, not just build success
- [ ] Anything unverified stated explicitly in the report
