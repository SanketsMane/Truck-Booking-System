# TruckGee Mobile (React Native / Expo)

Native Android and iOS app for TruckGee, built with Expo (managed workflow) and Expo Router. Reuses the existing `backend/` API almost entirely — see `/Users/sanketpatil/.claude/plans/polymorphic-nibbling-frog.md` for the full backend/screens/security plan this was built from.

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_API_URL and (optionally) EXPO_PUBLIC_LOCATIONIQ_TOKEN
npm start
```

Then press `i` (iOS Simulator), `a` (Android Emulator), or scan the QR code with Expo Go on a physical device.

**`EXPO_PUBLIC_API_URL`** — the backend's base URL. iOS Simulator can use `http://localhost:3000` directly; the Android Emulator needs `http://10.0.2.2:3000` instead; a physical device needs your machine's LAN IP (e.g. `http://192.168.1.23:3000`).

## What's implemented

**Backend** (in `../backend`, already shipped): a parallel bearer-token auth path alongside the web app's cookie session (`POST /auth/mobile/refresh`, `POST /auth/mobile/logout`, `X-Client-Type: mobile` header), FCM device-token push registration (`POST /push/device/register`), and an app-version gate (`GET /meta/mobile-config`, editable from the admin Settings page). See that plan doc for the full design rationale.

**App**: all 34 screens from the plan's inventory, wired to real API calls — auth (OTP + password login/signup, forgot password), shipper search → results → trip detail → booking, transporter truck registration/Change Vehicle → post-trip wizard → manage trip, chat (real-time via Socket.IO), profile + KYC verification + notification settings, support, disputes. Admin stays web-only, as scoped.

## What's NOT done yet — known gaps before this can ship

- **No Firebase project configured.** Push notifications need a real Firebase project: set `FIREBASE_SERVICE_ACCOUNT_JSON` on the backend (see `backend/utils/fcmPush.js`) and add the resulting `google-services.json`/`GoogleService-Info.plist` to this app. Without it, `sendFcmToUser` silently no-ops (same graceful-degrade pattern as the existing Web Push integration) and `registerDevice`/`getDevicePushTokenAsync` calls will fail at the native layer.
- **No EAS project set up** — no `eas.json`, no linked Expo/EAS account, no app-store listings (`com.truckgee.app` in `app.json` is a placeholder bundle id/package name, not a registered one). Needed before any real build/submit.
- **Never run on a real device or simulator by this session** — every screen was verified via `npx expo export` (confirms the whole app bundles with zero errors across ~1350 modules, both iOS and Android) and ESLint, not by clicking through the UI. Do a full manual pass before considering this done.
- **PDF KYC documents aren't supported** — `DocumentUploadField` only offers camera/gallery image capture (`expo-image-picker`), not `expo-document-picker` for an existing PDF file. The backend accepts PDFs; this app currently doesn't let you pick one.
- **Reset Password stays a web flow** — the emailed link opens the web `/reset-password` page in the device browser rather than deep-linking back into the app. Deliberate v1 simplification (see the plan), not an oversight.
- **Trip-post draft isn't persisted** — `PostTripContext` holds the in-progress trip in memory only; backgrounding/killing the app mid-wizard loses it (the web app persists its equivalent draft to `sessionStorage`).
- **Blog/News/Updates has no native screens** — deferred per the plan; link out to the web site instead if this becomes wanted.

## Project layout

- `app/` — Expo Router file-based routes. `(auth)/` = logged-out flow, `(app)/` = the tab-based authenticated app.
- `src/api/` — one file per backend resource, mirroring `frontend/src/api/*.js`'s shape almost exactly.
- `src/context/` — `AuthContext` (session state) and `PostTripContext` (the 4-step post-trip wizard's shared draft).
- `src/components/ui/` — shared primitives (Button, TextField, Card, etc.), matching the web app's palette (`src/theme.js`).
- `src/components/` — feature components shared across screens: `LocationField` (LocationIQ autocomplete + GPS), `DocumentUploadField` (camera/gallery KYC upload).
