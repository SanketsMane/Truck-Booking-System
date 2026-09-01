# Build and Gradle

A build should be reproducible, fast, and configured in one place. Hand-edited build files that drifted over two years are their own category of bug.

## 1. Version catalog

One source of truth for every dependency and version:

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.0.21"
compose-bom = "2024.10.00"
room = "2.6.1"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }

[bundles]
compose = ["compose-ui", "compose-material3", "compose-tooling-preview"]

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
```

```kotlin
dependencies {
    implementation(platform(libs.compose.bom))   // BOM aligns all Compose artifacts
    implementation(libs.bundles.compose)
    ksp(libs.room.compiler)
}
```

- Use BOMs (Compose, Firebase, OkHttp) so artifact versions cannot drift apart.
- **KSP, not KAPT.** KAPT is deprecated and roughly 2× slower.
- Never a version literal in a module build file.

## 2. Build types and flavors

```kotlin
android {
    buildTypes {
        debug {
            applicationIdSuffix = ".debug"      // debug and release installable side by side
            isDebuggable = true
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
    flavorDimensions += "env"
    productFlavors {
        create("dev")  { dimension = "env"; buildConfigField("String", "BASE_URL", "\"https://dev.api\"") }
        create("prod") { dimension = "env"; buildConfigField("String", "BASE_URL", "\"https://api\"") }
    }
}
```

- `applicationIdSuffix` on debug lets QA hold both builds at once.
- Environment config via flavors, **not** a runtime flag someone can flip into production.
- `buildConfigField` for non-secret config only. Secrets do not belong in the APK. -> `security.md` §6
- Keep the flavor matrix small — `2 flavors × 2 build types` is already 4 variants to test.

## 3. Signing

```kotlin
signingConfigs {
    create("release") {
        storeFile = file(System.getenv("KEYSTORE_PATH") ?: "keystore.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias = System.getenv("KEY_ALIAS")
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
```

- **Never commit a keystore or its passwords.** From environment variables or a secrets manager only. -> `ci-cd.md`
- Enable **Play App Signing** — Google holds the app signing key; you hold only the upload key, which can be reset if lost. Losing a non-Play-managed signing key means you can never update the app again.
- Record the Play app-signing SHA-256 — App Links and some SDKs need it. -> `deep-links.md` §3

## 4. R8

R8 shrinks, optimises and obfuscates. It is also where release-only crashes come from.

Keep rules for anything accessed reflectively:

```proguard
# Serialization models
-keepclassmembers class com.example.**$$serializer { *; }
-keepclassmembers,allowobfuscation class com.example.data.dto.** { <init>(...); }

# Keep line numbers for readable crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

- Prefer `@Keep` annotations over broad wildcard rules — a `-keep class com.example.**` disables shrinking entirely.
- Most libraries ship `consumer-rules.pro`; do not duplicate them.
- Check `build/outputs/mapping/release/` — `usage.txt` (removed) and `mapping.txt` (renames).
- **Upload `mapping.txt`** to Crashlytics and Play, or every release crash is unreadable. -> `observability.md`
- Test the release build. Reflection, serialization and DI failures appear only here.

## 5. Build speed

```properties
# gradle.properties
org.gradle.jvmargs=-Xmx4g -XX:+UseParallelGC
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configuration-cache=true
android.useAndroidX=true
kotlin.incremental=true
```

- Configuration cache is the biggest win on multi-module builds; fix the plugins that break it.
- `implementation` over `api` — `api` cascades recompilation to every consumer.
- Convention plugins in `build-logic/` so 20 modules share one config instead of 20 copies.
- `./gradlew --scan` to find where time actually goes before optimising.
- Debug builds: `isMinifyEnabled = false`, and consider disabling PNG crunching.

## 6. App size

- **Android App Bundle** (`.aab`) is required for Play. It generates per-device APKs, typically 15–35% smaller.
- `isShrinkResources = true` alongside minify.
- Vector drawables and WebP instead of PNG.
- Audit with `bundletool build-apks` + `get-size total`, or Android Studio's APK Analyzer.
- Watch transitive dependency weight — one convenience library can add megabytes.
- Play Feature Delivery for genuinely optional large features; do not over-engineer this.

## 7. Compile and target SDK

```kotlin
compileSdk = 35        // always the latest stable
minSdk = 24            // a real product decision, check your analytics
targetSdk = 35         // Play enforces a rolling deadline
```

- `compileSdk` latest — it costs nothing and enables new APIs and lint checks.
- `targetSdk` must meet Play's annual deadline or **updates are blocked**. Raising it changes runtime behaviour: re-test permissions, background limits, foreground service types and exported components. -> `release-and-play-store.md`
- `minSdk` is a business decision. Each step down costs desugaring, testing and workarounds.
- Core library desugaring for `java.time` and friends below API 26:

```kotlin
compileOptions { isCoreLibraryDesugaringEnabled = true }
dependencies { coreLibraryDesugaring(libs.desugar.jdk.libs) }
```

## 8. Anti-patterns

- Version literals scattered across module build files
- KAPT where KSP is available
- Keystore or passwords in the repository
- No Play App Signing
- Testing only debug builds, shipping an R8 crash
- Broad `-keep class **` rules
- `mapping.txt` not uploaded
- Secrets in `BuildConfig`
- Environment selected by a runtime flag
- `api` used by default
- Ignoring the target-API deadline until updates are blocked

## 9. Checklist

- [ ] Version catalog + BOMs; no literal versions in modules
- [ ] KSP, not KAPT
- [ ] Debug uses `applicationIdSuffix`; environments via flavors
- [ ] Signing from environment/secrets; Play App Signing enabled
- [ ] R8 on in release; keep rules minimal and targeted
- [ ] Release build installed and exercised before shipping
- [ ] `mapping.txt` uploaded to Crashlytics and Play
- [ ] AAB produced; size checked
- [ ] `compileSdk` and `targetSdk` current; behaviour changes re-tested
- [ ] Configuration cache and build cache enabled
