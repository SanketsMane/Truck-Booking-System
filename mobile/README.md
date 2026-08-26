# TruckGee Mobile (React Native / Expo)

Native Android and iOS app for TruckGee, built with Expo (managed workflow) and Expo Router. Reuses the existing `backend/` API almost entirely — see `/Users/sanketpatil/.claude/plans/polymorphic-nibbling-frog.md` for the full backend/screens/security plan this was built from.

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_API_URL and (optionally) EXPO_PUBLIC_LOCATIONIQ_TOKEN / EXPO_PUBLIC_WEB_URL
npm start
```

Then press `i` (iOS Simulator), `a` (Android Emulator), or scan the QR code with Expo Go on a physical device.

**`EXPO_PUBLIC_API_URL`** — the backend's base URL. iOS Simulator can use `http://localhost:3000` directly; the Android Emulator needs `http://10.0.2.2:3000` instead; a physical device needs your machine's LAN IP (e.g. `http://192.168.1.23:3000`).

## What's implemented

**Backend** (in `../backend`, already shipped): a parallel bearer-token auth path alongside the web app's cookie session (`POST /auth/mobile/refresh`, `POST /auth/mobile/logout`, `X-Client-Type: mobile` header), real per-device session management (`GET /auth/mobile/sessions`, `DELETE /auth/mobile/sessions/:id`), FCM device-token push registration (`POST /push/device/register`), and an app-version gate (`GET /meta/mobile-config`, editable from the admin Settings page). See that plan doc for the full design rationale.

**App**: the plan's 34-screen inventory, plus this round's gap-filling pass, wired to real API calls — auth (OTP + password login/signup, forgot password), a first-launch onboarding carousel, shipper search → results → trip detail → booking, transporter truck registration/Change Vehicle → post-trip wizard → manage trip, chat (real-time via Socket.IO), profile + KYC verification + notification settings + Manage Devices, support, disputes, Blog/News/Updates (list + detail, reusing `/content/posts`), and the static About/For Shippers/Help/FAQ pages (ported from the real web copy). Admin stays web-only, as scoped.

**Public browsing** (added this round, matching the web app): Home, Search Results, and Trip Detail work for anyone — only actually requesting to book, and every account-scoped screen (Bookings/Trucks/Chat/Profile's real content), require login. `(app)` and `(auth)` are both always-mounted sibling routes now (not the old `Stack.Protected` split); a gated screen shows a "log in to continue" prompt via `src/components/AuthRequired.js` rather than the whole app branching on auth state.

## What's NOT done yet — known gaps before this can ship

- **No Firebase project configured.** Push notifications need a real Firebase project: set `FIREBASE_SERVICE_ACCOUNT_JSON` on the backend (see `backend/utils/fcmPush.js`) and add the resulting `google-services.json`/`GoogleService-Info.plist` to this app. Without it, `sendFcmToUser` silently no-ops (same graceful-degrade pattern as the existing Web Push integration) and `registerDevice`/`getDevicePushTokenAsync` calls will fail at the native layer.
- **No EAS project set up** — no `eas.json`, no linked Expo/EAS account, no app-store listings (`com.truckgee.app` in `app.json` is a placeholder bundle id/package name, not a registered one). Needed before any real build/submit.
- **Never run on a real device or simulator by this session** — every screen was verified via `npx expo export` (confirms the whole app bundles with zero errors across ~1350 modules, both iOS and Android) and ESLint, not by clicking through the UI. Do a full manual pass before considering this done.
- **PDF KYC documents aren't supported** — `DocumentUploadField` only offers camera/gallery image capture (`expo-image-picker`), not `expo-document-picker` for an existing PDF file. The backend accepts PDFs; this app currently doesn't let you pick one.
- **Reset Password stays a web flow** — the emailed link opens the web `/reset-password` page in the device browser rather than deep-linking back into the app. Deliberate v1 simplification (see the plan), not an oversight.
- **Trip-post draft isn't persisted** — `PostTripContext` holds the in-progress trip in memory only; backgrounding/killing the app mid-wizard loses it (the web app persists its equivalent draft to `sessionStorage`).
- **Terms and Privacy stay web pages, opened in the device browser** — deliberate, not deferred: they're long legal documents that need one single source of truth, so `EXPO_PUBLIC_WEB_URL` + `Linking.openURL` are used instead of a second native copy that could drift out of sync with the real one.
- **Blog/News/Updates cover images and body text are unauthenticated `<Image>`/plain-text only** — no native HTML renderer is included (post bodies are sanitized HTML server-side); `src/utils/stripHtml.js` strips tags down to readable text rather than pulling in a new dependency just for this.

## Project layout

- `app/` — Expo Router file-based routes. `(auth)/` = logged-out flow, `(app)/` = the tab-based authenticated app.
- `src/api/` — one file per backend resource, mirroring `frontend/src/api/*.js`'s shape almost exactly.
- `src/context/` — `AuthContext` (session state) and `PostTripContext` (the 4-step post-trip wizard's shared draft).
- `src/components/ui/` — shared primitives (Button, TextField, Card, etc.), matching the web app's palette (`src/theme.js`).
- `src/components/` — feature components shared across screens: `LocationField` (LocationIQ autocomplete + GPS), `DocumentUploadField` (camera/gallery KYC upload).
