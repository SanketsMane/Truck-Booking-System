# Deep links

A deep link that lands on the right screen with the wrong back stack is a bug. So is one that opens a disambiguation dialog because verification was never set up.

## 1. The three kinds

| Kind | Scheme | Verified | Behaviour |
| --- | --- | --- | --- |
| **Custom scheme** | `myapp://txn/123` | No | Any app can claim it. Fine for OAuth callbacks, unsafe as a primary entry point |
| **Web link** | `https://example.com/txn/123` | No | Shows an app-chooser dialog |
| **App Link** | `https://example.com/txn/123` | **Yes** | Opens your app directly, no dialog |

Ship **App Links** for anything user-facing. The disambiguation dialog is a conversion killer and looks unprofessional.

## 2. Manifest

```xml
<activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTop">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="example.com" android:pathPrefix="/txn" />
    </intent-filter>
</activity>
```

- `android:autoVerify="true"` is what makes it an App Link.
- `exported="true"` is required — and means the intent is **untrusted input**. Validate everything.
- `singleTop` + `onNewIntent` handling, or a second tap creates a duplicate activity.

## 3. assetlinks.json

Served at `https://example.com/.well-known/assetlinks.json`, over HTTPS, no redirects, `Content-Type: application/json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.app",
    "sha256_cert_fingerprints": ["AB:CD:..."]
  }
}]
```

The fingerprint must be from the **certificate that actually signs the installed app**. With Play App Signing that is the **Play upload/app signing certificate** from the Play Console, not your local keystore. Getting this wrong is the single most common App Links failure.

Include fingerprints for every signing certificate in play: debug, internal, and production.

```bash
# Verify
adb shell pm get-app-links <applicationId>
adb shell pm verify-app-links --re-verify <applicationId>

# Test a link
adb shell am start -a android.intent.action.VIEW -d "https://example.com/txn/123" <applicationId>
```

## 4. Back stack synthesis

A deep link into a detail screen must not leave back as "exit the app".

```kotlin
// Navigation Compose: land in a nested graph whose start destination is the parent
navController.navigate(TransactionDetail(id)) {
    popUpTo(Home)      // ensure Home is beneath it
}
```

Or build it explicitly:

```kotlin
TaskStackBuilder.create(ctx)
    .addNextIntentWithParentStack(detailIntent)
    .getPendingIntent(0, FLAG_UPDATE_CURRENT or FLAG_IMMUTABLE)
```

Rule from `../../mobile-product-engineer/references/navigation.md`: back from a deep-linked screen goes to its logical parent, then home, then out. Never straight out.

## 5. Handling the intent

```kotlin
override fun onCreate(savedInstanceState: Bundle?) { ...; handle(intent) }
override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); handle(intent) }

private fun handle(intent: Intent) {
    val uri = intent.data ?: return
    val id = uri.lastPathSegment?.takeIf { it.matches(ID_REGEX) } ?: return showInvalidLink()
    ...
}
```

- **Validate every parameter.** An exported activity receives whatever any app on the device sends.
- Never trust a deep link to carry authorisation. `?userId=` in a URL is not authentication — re-check the session server-side.
- Never accept a redirect target from the link without allow-listing it (open-redirect).
- Handle: malformed link, valid link to a resource the user cannot access, valid link while signed out.

## 6. Signed-out and gated links

The most-missed case. A user taps a transaction link from an email while logged out.

1. Store the pending destination.
2. Send them through sign-in (and app-lock/biometric if applicable).
3. Resume to the stored destination afterwards.
4. Clear the pending destination on cancel or timeout.

Do not drop them on Home and lose the link — that is a support ticket.

## 7. Deferred deep links

For "install the app then open this content", the link must survive the Play Store round trip. Google Play Install Referrer or a vendor (Branch, AppsFlyer, Firebase Dynamic Links — note Dynamic Links is deprecated and shutting down; do not adopt it for new work).

Keep the referrer payload minimal and treat it as untrusted.

## 8. Testing matrix

- [ ] App not installed → link opens the browser/Play, not a broken chooser
- [ ] App installed, signed out → sign-in then resume to the target
- [ ] App installed, signed in, cold start
- [ ] App already open (`onNewIntent` path)
- [ ] Malformed / unknown / unauthorised id
- [ ] Verification actually passing (`pm get-app-links` shows `verified`)
- [ ] Back from the deep-linked screen goes to the parent, not out of the app

## 9. Anti-patterns

- No `autoVerify`, so users see the chooser dialog
- Wrong SHA-256 (local keystore instead of Play App Signing)
- `assetlinks.json` behind a redirect or with the wrong content type
- Deep link landing with an empty back stack
- Trusting link parameters as authorisation
- No `onNewIntent` handling with `singleTop`
- Losing the destination when the user must sign in first
- Sensitive data in link parameters
- Adopting Firebase Dynamic Links for new work

## 10. Checklist

- [ ] App Links with `autoVerify`; `assetlinks.json` served correctly
- [ ] Fingerprints match Play App Signing, for every signing config
- [ ] `pm get-app-links` reports verified on a real device
- [ ] Every parameter validated; link never treated as authorisation
- [ ] Back stack synthesised to the logical parent
- [ ] Signed-out flow stores and resumes the destination
- [ ] `onNewIntent` handled
- [ ] Full testing matrix walked
