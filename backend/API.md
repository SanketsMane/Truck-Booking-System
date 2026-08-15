# ShareTruck API Reference

Base URL: `VITE_API_URL` in the frontend / wherever the backend is deployed (e.g. `http://localhost:3000` locally). All requests/responses are JSON unless noted. Authenticated routes read a JWT from an `httpOnly` cookie named `token` — the browser sends it automatically once set by `/auth/verify-otp`; non-browser clients need to forward that cookie explicitly (`credentials: "include"` on `fetch`).

Every response is `{ success: boolean, msg?: string, ...data }`. Errors use the same shape with `success: false` and an appropriate HTTP status (400 validation, 401 unauthenticated, 403 forbidden/role-gated, 404 not found, 409 conflict, 429 rate-limited, 500 server error).

## Auth — `/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/request-otp` | — | `{ mobile }` | 10-digit Indian mobile. Rate-limited (SRS-01.3): cooldown between sends, max requests/hour, lockout on breach. |
| POST | `/verify-otp` | — | `{ mobile, otp, name?, email?, city?, roles? }` | `name` required the first time a mobile completes signup. Issues the session cookie. |
| POST | `/logout` | — | — | Clears the session cookie. |
| POST | `/roles` | ✓ | `{ role: "shipper"\|"transporter" }` | Adds a role to the account without re-verifying the mobile number. |
| POST | `/refresh` | ✓ | — | Reissues the session cookie with the account's current roles/admin flag. |
| GET | `/profile` | ✓ | — | Returns the caller's own profile. |
| PUT | `/profile` | ✓ | `{ name?, email?, city?, profilePhoto?, notificationPreferences? }` | Mobile/roles/isAdmin/status are not editable here. |

## Files — `/files`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/` | ✓ | `multipart/form-data`, field `file` | JPEG/PNG/PDF, ≤10MB. Returns `{ file: { id, url } }`. |
| GET | `/:id` | ✓ | — | Streams the file. Only the uploading user or an admin may fetch it — never a public URL. |

## Verification (KYC) — `/verification`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/` | ✓ | `{ type: "shipper"\|"transporter", documents: [{docType, fileId}] }` | Upsert; resubmission always resets status to `pending`. |
| GET | `/me` | ✓ | — | Caller's own verification records. |
| GET | `/queue` | admin | query `type?, status? (default pending, "all" = no filter)` | |
| PUT | `/:id/review` | admin | `{ status: "verified"\|"rejected", reason? }` | `reason` required on reject. Audit-logged. |

## Trucks — `/trucks`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/` | ✓ | `{ regNumber, truckType, bodyType?, totalCapacity, documents? }` | `regNumber` unique. |
| GET | `/me` | ✓ | — | Caller's own trucks. |
| PUT | `/:id` | ✓ (owner) | `{ truckType?, bodyType?, totalCapacity? }` | `regNumber` immutable. |
| POST | `/:id/documents` | ✓ (owner) | `{ documents: [{docType, fileId}] }` | Appends docs; resubmits (→ pending) if previously rejected. |
| GET | `/queue` | admin | query `status? (default pending, "all" = no filter)` | |
| PUT | `/:id/review` | admin | `{ status, reason? }` | Audit-logged. |

## Trips — `/trips`

| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/search` | — | `fromCity, toCity, date` required; `minCapacity?, sort? (departure\|price\|rating), rangeDays?` | Exact city match (case-insensitive), date ± window. Only `published` trips with spare capacity. |
| GET | `/popular-routes` | — | — | Top routes by published-trip count. |
| GET | `/me` | ✓ transporter | query `status?` | Caller's own posted trips. |
| POST | `/search-alerts` | ✓ | `{ fromCity, toCity, date }` | Notifies the user when a matching trip is later published. |
| POST | `/` | ✓ transporter | `{ truckId, fromCity, toCity, departureAt, estimatedArrivalAt?, pickupPoint, dropPoint, totalCapacity, availableCapacity, pricePerTon }` | Gated on the truck AND the transporter's own KYC being verified (toggle: see `/admin/settings`). |
| GET | `/:id` | — | — | Full trip detail, truck + transporter populated. |
| PUT | `/:id` | ✓ (owner) | `{ departureAt?, estimatedArrivalAt?, pickupPoint?, dropPoint?, totalCapacity?, pricePerTon? }` | Can't drop `totalCapacity` below what's already booked. |
| DELETE | `/:id` | ✓ (owner) | — | Cancels the trip; cascades to cancel its pending/confirmed bookings. |

## Bookings — `/bookings`

| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/me` | ✓ | `role? (shipper\|transporter, default shipper), status?, tripId?` | |
| POST | `/` | ✓ shipper | `{ tripId, capacityRequested, goodsDescription, handlingNotes?, pickupPoint? }` | Capacity soft-held against other pending requests; `priceEstimate` computed server-side. |
| GET | `/:id` | ✓ (party or admin) | — | |
| PUT | `/:id/accept` | ✓ transporter (owner) | — | Atomic capacity decrement; gated on the shipper's own KYC (toggle). |
| PUT | `/:id/reject` | ✓ transporter (owner) | `{ reason? }` | |
| PUT | `/:id/cancel` | ✓ (either party) | `{ reason? }` | Only while `confirmed`; subject to a cancellation-window policy (currently 6h before departure — a placeholder pending client sign-off, see FRD/SRS Appendix B). |
| PUT | `/:id/confirm-pickup` | ✓ (either party) | — | `confirmed` → `ongoing`. |
| PUT | `/:id/confirm-drop` | ✓ (either party) | — | `ongoing` → `completed`. |

Booking states: `pending → confirmed → ongoing → completed`, or `pending → rejected/expired`, or `confirmed → cancelled`.

## Chat — `/chat`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/booking/:bookingId` | ✓ (participant) | — | Returns the thread for a booking. |
| GET | `/:threadId/messages` | ✓ (participant) | — | |
| POST | `/:threadId/messages` | ✓ (participant) | `{ text }` | Persists + fans out live via Socket.IO room `thread:<id>`, and notifies the other participant. |
| PUT | `/:threadId/read` | ✓ (participant) | — | |

**Socket.IO**: connect with the session cookie (`withCredentials: true`). Emit `chat:join`/`chat:leave` with a `threadId` to subscribe; listen for `chat:message` and `chat:typing`. Also listen for `notification:new` (any authenticated, connected user gets this whenever a `Notification` is created for them).

## Ratings — `/ratings`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/` | ✓ (booking party) | `{ bookingId, stars, reviewText? }` | Only once a booking is `completed`; one rating per (booking, rater). |
| GET | `/user/:userId` | — | — | Public, non-moderated reviews. |
| PUT | `/:id/flag` | ✓ | — | Any authenticated user can flag a review. |
| PUT | `/:id/moderate` | admin | `{ action: "hide"\|"remove" }` | |

## Payment log — `/payment-logs`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | admin | query `status?` | |
| POST | `/` | admin | `{ bookingId, amount, status: "paid"\|"unpaid"\|"partial" }` | No payment gateway in MVP — this is a manual reconciliation record. Audit-logged. |
| GET | `/booking/:bookingId` | ✓ (party or admin) | — | Read-only for booking parties. |

## Notifications — `/notifications`

| Method | Path | Auth | Query | Notes |
|---|---|---|---|---|
| GET | `/me` | ✓ | `unreadOnly?` | |
| PUT | `/:id/read` | ✓ | — | |
| PUT | `/read-all` | ✓ | — | |

## Support — `/support`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/` | ✓ | `{ subject, message, bookingId? }` | |
| GET | `/me` | ✓ | — | |
| GET | `/` | admin | query `status?` | |
| PUT | `/:id/resolve` | admin | — | |

## Admin — `/admin` (every route requires `isAdmin`)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| GET | `/dashboard` | — | Metrics, 30-day bookings trend, top routes, recent activity. |
| GET | `/users` | `search?, role?, status?` | |
| GET | `/users/:id` | — | Profile + verifications + trucks + booking history. |
| PUT | `/users/:id/status` | `{ status, reason? }` | `reason` required for suspend/ban. Audit-logged. |
| GET | `/trips` | `search?, status?` | |
| PUT | `/trips/:id/deactivate` | `{ reason }` | Cascades to cancel affected bookings. Audit-logged. |
| GET | `/bookings` | `status?` | |
| PUT | `/bookings/:id/force-cancel` | `{ reason }` | Bypasses the normal party/cancellation-window checks. Audit-logged. |
| GET | `/settings` | — | `{ verificationGateEnabled }` |
| PUT | `/settings` | `{ verificationGateEnabled }` | SRS-02.3 admin-level toggle. Audit-logged. |
| GET | `/reports/bookings.csv` | — | |
| GET | `/reports/revenue-by-route.csv` | — | |
| GET | `/reports/user-growth.csv` | — | |
| GET | `/reports/verification-turnaround.csv` | — | |

All admin actions that mutate state are recorded in the `AuditLog` collection (`actor, action, targetType, targetId, before, after, reason, createdAt`) per SRS §5.8.
