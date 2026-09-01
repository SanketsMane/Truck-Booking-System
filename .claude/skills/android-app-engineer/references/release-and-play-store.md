# Release and Play Store

Shipping is part of engineering. A build that cannot be rolled back, diagnosed or updated is not production-ready.

## 1. Versioning

```kotlin
versionCode = 1_04_02        // monotonic integer, never reused or decreased
versionName = "1.4.2"        // what users see
```

- `versionCode` must increase with every upload, forever. Derive it from CI build number or from `versionName`, but never hand-edit it twice to the same value.
- Bundle-per-track means the same `versionCode` cannot be uploaded to two tracks.

## 2. Tracks and staged rollout

```
Internal testing  → seconds to propagate, up to 100 testers, no review
Closed (alpha)    → invited testers, review applies
Open (beta)       → public opt-in
Production        → staged rollout
```

**Always stage.** 5% → 20% → 50% → 100%, watching crash-free rate and ANR rate at each step. Halt and fix rather than rolling forward on a regression.

A staged rollout can be **halted** but not un-shipped — users on the bad version stay there until they update. That is why the gate before 100% matters.

## 3. Pre-launch checks

Play runs your app on real devices before release and reports crashes, ANRs, accessibility issues and security warnings. Read the report — it catches device-specific crashes your emulator will not.

## 4. Target API deadline

Play enforces a rolling requirement: new apps and updates must target a recent API level, typically within a year of release. **Miss it and you cannot ship updates at all** — existing installs keep working, but you are frozen.

Raising `targetSdk` changes runtime behaviour. Re-test at minimum:
- Runtime permissions (new ones, changed semantics)
- Background execution and foreground service types -> `background-work.md`
- Exported component requirements
- Scoped storage and media access -> `permissions-and-privacy.md`
- Edge-to-edge enforcement -> `../../mobile-product-engineer/references/android.md`
- Predictive back

Treat a target-API bump as a feature with its own QA pass, not a one-line change.

## 5. In-app updates

```kotlin
appUpdateManager.startUpdateFlowForResult(info, AppUpdateType.FLEXIBLE, activity, REQ)
```

| Type | Use |
| --- | --- |
| **Flexible** | Normal updates — downloads in the background, user keeps using the app |
| **Immediate** | Only when the old version genuinely cannot function: breaking API change, critical security fix |

Do not use immediate updates for ordinary releases; it is hostile. For a genuine hard stop, prefer a server-driven "minimum supported version" check so you control it without a Play round trip.

## 6. Store listing and policy

- **Data Safety form must match reality**, including transitive SDKs. Mismatches cause suspension. -> `permissions-and-privacy.md` §6
- Privacy policy URL required; account deletion path required if you support sign-up.
- Screenshots must be of the actual app.
- Permissions that look unjustified against your description trigger review.
- Financial apps: many regions require licence documentation, and lending apps have specific Play requirements. Flag these rather than guessing.
- Restricted permissions (`SMS`, `CALL_LOG`, `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`, `USE_EXACT_ALARM`) each need a declared, accepted justification.

## 7. Rollback

There is no un-publish for a version users already installed. Your options:

1. **Halt** the staged rollout (stops further users receiving it).
2. Ship a **fix-forward** release with a higher `versionCode`.
3. Use Play's "restore previous version" where available — it re-serves the older bundle to new installers, not to those already updated.

So: a **server-side kill switch** or feature flag for anything risky is worth more than any rollback mechanism. Ship risky changes behind a flag you can turn off without a release.

## 8. Release checklist

Before uploading:

- [ ] `versionCode` incremented; `versionName` correct
- [ ] Release build installed on a real device and exercised end to end
- [ ] R8 on; no obfuscation crashes -> `build-and-gradle.md`
- [ ] `mapping.txt` uploaded to Crashlytics and Play
- [ ] Baseline profile regenerated if startup/navigation changed -> `performance.md`
- [ ] No debug logging, no test endpoints, no debug flags enabled
- [ ] Signed with the release config; Play App Signing in place
- [ ] Migrations tested from the **currently shipped** version, not just the previous commit
- [ ] Deep links verified against the Play signing certificate
- [ ] Data Safety form current
- [ ] Crash-free and ANR baselines noted so you can compare after rollout
- [ ] Feature flags for risky changes, default off
- [ ] Release notes written

After uploading:

- [ ] Pre-launch report reviewed
- [ ] Internal track smoke-tested first
- [ ] Staged rollout started at a low percentage
- [ ] Crash-free rate, ANR rate and key funnels watched before each increase

## 9. Anti-patterns

- Shipping straight to 100%
- No release-build testing
- `mapping.txt` not uploaded, so crashes are unreadable
- Migrations tested only from the previous commit, not the shipped version
- Immediate in-app update for a routine release
- Discovering the target-API deadline when updates are already blocked
- Risky change with no kill switch
- Data Safety form written once and never revisited
