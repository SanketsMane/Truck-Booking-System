# Permissions and privacy

Every permission is a conversion cost and a Play-policy obligation. Request the fewest, at the right moment, and declare them honestly.

## 1. The rule

**Never request a permission at launch.** Request at the moment the feature needs it, after in-app priming that explains the benefit. -> `../../mobile-product-engineer/references/notifications.md` for the priming copy pattern.

```kotlin
val launcher = rememberLauncherForActivityResult(RequestPermission()) { granted ->
    if (granted) startScan() else showRationaleOrSettings()
}
```

## 2. Three outcomes, always

| Outcome | Detect | Do |
| --- | --- | --- |
| Granted | callback `true` | proceed |
| Denied once | `shouldShowRequestPermissionRationale() == true` | explain why, offer to ask again |
| Denied permanently ("Don't ask again") | callback `false` **and** rationale `false` | route to app settings with an explanation |

```kotlin
Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
       Uri.fromParts("package", packageName, null))
```

There is a trap: `shouldShowRequestPermissionRationale()` also returns `false` **before the first request**. Track "have we asked before" yourself in DataStore, or you will send first-time users to settings.

Permissions can also be **auto-revoked** after months of non-use, and revoked manually at any time. Re-check before every use; never cache "granted" forever.

## 3. Common permissions

| Permission | Notes |
| --- | --- |
| `POST_NOTIFICATIONS` | Runtime on 13+. -> `push-notifications.md` |
| `CAMERA` | KYC/document capture. Explain what is captured and that it is not shared |
| `READ_MEDIA_IMAGES` | 13+ replaces `READ_EXTERNAL_STORAGE`. Prefer **Photo Picker** — no permission needed at all |
| `READ_CONTACTS` | Heavy trust cost. Offer manual entry; state whether data leaves the device |
| `ACCESS_FINE_LOCATION` | Ask for coarse first if it suffices; background location needs separate, staged consent and Play review |
| `RECEIVE_SMS` / `READ_SMS` | Restricted by Play. Use **SMS Retriever API** for OTP — no permission required |
| `SCHEDULE_EXACT_ALARM` | Play-restricted. -> `background-work.md` |
| `QUERY_ALL_PACKAGES` | Play-restricted. Use `<queries>` instead |

**The best permission is the one you do not need.** Photo Picker, SMS Retriever, `ACTION_OPEN_DOCUMENT` and Credential Manager all avoid permissions entirely.

## 4. Scoped storage

Since Android 10/11 you cannot roam the filesystem.

| Need | Use | Permission |
| --- | --- | --- |
| App's own files | `filesDir`, `cacheDir` | none |
| Pick an image/video | Photo Picker (`PickVisualMedia`) | none |
| Pick any file | `ACTION_OPEN_DOCUMENT` (SAF) | none |
| Save a user-visible file | `ACTION_CREATE_DOCUMENT` or MediaStore | none |
| Share a file with another app | `FileProvider` + `content://` URI | none |
| Read all media | `READ_MEDIA_IMAGES`/`VIDEO`/`AUDIO` | runtime |

`MANAGE_EXTERNAL_STORAGE` requires a Play exemption and is rejected for almost every app. Never `file://` URIs across app boundaries — that throws `FileUriExposedException`.

Android 14+ adds **partial media access** ("Select photos") — handle the case where you have access to *some* photos, not all.

## 5. Package visibility

Android 11+ hides other installed apps.

```xml
<queries>
    <package android:name="com.some.upi.app" />
    <intent><action android:name="android.intent.action.VIEW" />
        <data android:scheme="https" /></intent>
</queries>
```

Without this, `resolveActivity()` returns null and `queryIntentActivities()` returns empty — a classic "works on my old device" bug. This bites UPI intent flows hard. -> `payments.md`

`QUERY_ALL_PACKAGES` needs a Play justification and is usually refused.

## 6. Data Safety declaration

Play requires an accurate Data Safety form. It is legally binding and mismatches get apps suspended.

Declare for every data type: whether it is **collected**, **shared** with third parties, whether it is **encrypted in transit**, and whether users can **request deletion**.

Easy to miss:
- Analytics and crash SDKs collect device identifiers and usage data
- Ad SDKs share data
- A support chat SDK may collect messages
- Anything your backend logs from the app

Audit your **transitive** SDKs, not just your own code. Keep the declaration in sync when you add a dependency — make it a step in your dependency review. -> `project-setup.md`

Also required: a privacy policy URL, and an in-app **account deletion** path if you support account creation.

## 7. Minimising and protecting data

- Collect only what the feature needs. Every extra field is a liability.
- Do not log PII — scrub at the logger, and never send it to Crashlytics. -> `observability.md`
- Do not put PII in `SavedStateHandle` (written to disk) or in URLs.
- Prefer resettable advertising IDs over hardware identifiers. `ANDROID_ID` is per-app-signing-key and resets on factory reset; IMEI/serial are unavailable and prohibited.
- Encrypt sensitive data at rest. -> `security.md`
- Have a real deletion path — both local (sign-out clears caches, DB, secure storage) and server-side.

## 8. Children and sensitive categories

If the app targets or may attract children, Families Policy applies: no ad IDs, restricted SDKs, content rating obligations. Financial apps have their own Play requirements around lending, and many regions require licence documentation. Flag these to the user rather than guessing. -> `release-and-play-store.md`

## 9. Anti-patterns

- Requesting everything at launch
- Requesting a permission a feature does not need
- Treating "denied" and "denied permanently" the same
- Using `shouldShowRequestPermissionRationale` before ever asking
- Caching "granted" and never re-checking
- `READ_EXTERNAL_STORAGE` where Photo Picker would do
- `READ_SMS` for OTP instead of SMS Retriever
- `QUERY_ALL_PACKAGES` instead of `<queries>`
- `file://` URIs shared across apps
- Data Safety form that omits SDK-collected data
- PII in logs, crash reports or saved state

## 10. Checklist

- [ ] Every declared permission justified by a shipped feature
- [ ] Requested in context, after priming; never at launch
- [ ] All three outcomes handled; "asked before" tracked explicitly
- [ ] Re-checked before each use (auto-revoke, manual revoke)
- [ ] Permission-free APIs preferred (Photo Picker, SAF, SMS Retriever)
- [ ] `<queries>` declared for every external app you resolve
- [ ] Partial media access handled on 14+
- [ ] Data Safety form matches reality, including transitive SDKs
- [ ] No PII in logs, crash reports, URLs or saved state
- [ ] Account and data deletion path exists
