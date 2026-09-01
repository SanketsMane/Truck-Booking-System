# Security

Implementation. The user-facing side — auth ladders, masking, session UX, fraud messaging — is in `../../mobile-product-engineer/references/security-ux.md`.

## 1. Storage

| Data | Store in |
| --- | --- |
| Access/refresh tokens, PIN hashes, API secrets | **EncryptedSharedPreferences** or Keystore-wrapped |
| Encryption keys | **Android Keystore** — the key never leaves hardware |
| User settings | DataStore (unencrypted is fine) |
| Cached business data | Room; encrypt with SQLCipher if it holds sensitive records |
| Anything at all | **never** plain `SharedPreferences`, never a plain file, never source |

```kotlin
val mk = MasterKey.Builder(ctx)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .setUserAuthenticationRequired(false)
    .build()

val prefs = EncryptedSharedPreferences.create(
    ctx, "secure_prefs", mk,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
)
```

`androidx.security:security-crypto` is deprecated in favour of newer alternatives; if starting fresh, prefer Keystore + Tink directly, or check the current AndroidX guidance. Either way, the rule stands: **never plaintext**.

On a rooted device, nothing on disk is truly safe. Keystore with `setUserAuthenticationRequired(true)` and hardware backing raises the bar meaningfully.

## 2. Keystore and biometric-bound keys

```kotlin
KeyGenParameterSpec.Builder("txn_key", PURPOSE_ENCRYPT or PURPOSE_DECRYPT)
    .setBlockModes(BLOCK_MODE_GCM)
    .setEncryptionPaddings(ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)
    .setUserAuthenticationParameters(30, AUTH_BIOMETRIC_STRONG)
    .setInvalidatedByBiometricEnrollment(true)   // critical
    .build()
```

`setInvalidatedByBiometricEnrollment(true)` invalidates the key when a **new fingerprint or face is enrolled**. Without it, someone who gains the device passcode can enrol their own biometric and unlock the previous user's data. This is a real attack, not theory.

Handle `KeyPermanentlyInvalidatedException` by clearing the key and re-authenticating fully.

## 3. Biometric authentication

```kotlin
BiometricPrompt.PromptInfo.Builder()
    .setTitle("Confirm payment")
    .setSubtitle("₹5,000 to Priya Sharma")     // say what is being authorised
    .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
    .build()
```

- `BIOMETRIC_STRONG` for anything financial. `BIOMETRIC_WEAK` includes face unlock on many devices and is not sufficient.
- Always offer a fallback (`DEVICE_CREDENTIAL` or your own PIN).
- For high-value operations, use the `CryptoObject` variant so success is cryptographically bound, not just a boolean your code could be patched to ignore.
- Handle: no hardware, none enrolled, locked out (temporary and permanent), user cancelled — each with a different message.
- Never build a fake fingerprint UI.

## 4. Transport

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors><certificates src="system" /></trust-anchors>
    </base-config>
</network-security-config>
```

- Cleartext off, everywhere, including debug where possible.
- **Never** trust user-added CAs in production — that is exactly how an interception proxy reads your traffic.
- Certificate pinning for high-value endpoints:

```kotlin
CertificatePinner.Builder()
    .add("api.example.com", "sha256/PRIMARY=")
    .add("api.example.com", "sha256/BACKUP=")   // backup pin is mandatory
    .build()
```

Pinning without a backup pin and a rotation plan bricks your app when the certificate rotates. Pin to the intermediate CA rather than the leaf, and ship a remote kill-switch.

## 5. Play Integrity

Replaces SafetyNet Attestation. Verifies the app binary, the Play install source and basic device integrity.

- **Verify the token server-side.** Client-side verification is trivially bypassed and worth nothing.
- Use it to gate risk decisions (raise step-up auth, flag for review), not as a hard block — false positives on legitimate rooted or custom-ROM devices are real.
- Combine with server-side risk signals; never let the client be the only judge.

Root/emulator detection: mild deterrent only. Do not block legitimate users on it alone.

## 6. Code protection

```kotlin
buildTypes {
    release {
        isMinifyEnabled = true
        isShrinkResources = true
        proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
}
```

R8 obfuscation raises the cost of reverse engineering; it is not a security boundary. Assume a determined attacker reads your code.

Therefore: **no secret in the APK is secret.** Not in `BuildConfig`, not in a string resource, not in NDK, not obfuscated. Any key shipped in the app is a public key in practice.

- API secrets belong on your server; the app calls your server.
- If a third-party SDK requires a client key, scope and rate-limit it server-side and restrict it by package + signing certificate.
- Upload mapping files to Crashlytics/Play so release crashes are readable. -> `observability.md`

## 7. Screen and IPC protection

```kotlin
// Block screenshots and hide from the app switcher on sensitive screens
window.setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE)
```

Apply on PIN entry, card details and full account numbers. Do **not** apply to receipt screens — users legitimately share those. -> `../../mobile-product-engineer/references/security-ux.md`

- `android:exported="false"` on every component that does not need to be public. Android 12+ requires the attribute explicitly.
- Validate all input to exported components — they receive data from any app. -> `deep-links.md`
- `FLAG_IMMUTABLE` on every `PendingIntent`.
- Never expose a `ContentProvider` without permissions.
- `android:allowBackup="false"` for apps holding sensitive data, or configure `dataExtractionRules` to exclude secrets — otherwise `adb backup` can extract them.
- `android:debuggable` must be false in release (it is by default; never override).

## 8. Logging

```kotlin
if (BuildConfig.DEBUG) Timber.plant(Timber.DebugTree())
// release: a tree that forwards to Crashlytics with PII scrubbed, and never logs verbose
```

Never log: tokens, PINs, card numbers, account numbers, balances, OTPs, full names with amounts, request/response bodies. Logcat is readable by other apps in some configurations and is captured in bug reports.

## 9. Anti-patterns

- Tokens in `SharedPreferences` or DataStore
- Keys without `setInvalidatedByBiometricEnrollment`
- `BIOMETRIC_WEAK` for payments
- Trusting user-added CAs in release
- Pinning with no backup pin or rotation plan
- Verifying Play Integrity on the client
- Any secret shipped in the APK
- `exported="true"` by default
- Mutable `PendingIntent`
- `allowBackup="true"` on an app holding secrets
- Logging bodies in release
- Treating R8 as a security control

## 10. Checklist

- [ ] Tokens and keys in EncryptedSharedPreferences / Keystore, never plaintext
- [ ] Biometric-bound keys invalidated on new enrolment
- [ ] `BIOMETRIC_STRONG` + fallback; all failure cases handled
- [ ] Cleartext disabled; user CAs untrusted in release
- [ ] Pinning has backup pins, rotation plan, kill switch
- [ ] Play Integrity verified server-side, used as a signal not a gate
- [ ] No secrets in the APK; server holds them
- [ ] `FLAG_SECURE` on PIN/card screens; app-switcher snapshot obscured
- [ ] Everything `exported="false"` unless required; exported input validated
- [ ] `allowBackup` configured deliberately
- [ ] No PII in logs, crash reports or analytics
- [ ] R8 enabled and the release build tested
