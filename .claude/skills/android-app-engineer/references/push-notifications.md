# Push notifications

The infrastructure side. The UX side — when to ask, what to say, priming, badges — is in `../../mobile-product-engineer/references/notifications.md`.

## 1. POST_NOTIFICATIONS is a runtime permission

Android 13+ requires it. Without it, every notification is silently dropped.

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

- Request **when notifications become useful**, never at first launch.
- Prime in-app first, then trigger the system dialog on the user's tap.
- If `targetSdk < 33`, the system asks on first channel creation — but do not rely on that; target current API is mandatory anyway. -> `release-and-play-store.md`
- Handle permanent denial: route to app notification settings, do not re-prompt.

## 2. Channels

Channels are created once and are **immutable** afterwards — importance, sound and vibration can only be changed by the user after creation.

```kotlin
val channel = NotificationChannel(
    "transactions", "Transactions", NotificationManager.IMPORTANCE_HIGH,
).apply { description = "Money received, sent, and payment results" }
manager.createNotificationChannel(channel)
```

- One channel per **user-meaningful category** (Transactions, Security alerts, Offers) so users can mute marketing without muting fraud alerts. This is a real retention lever.
- Never a single "General" channel for everything.
- Getting importance wrong is permanent for existing installs — you must create a new channel id to change it, which resets user preferences. Decide carefully the first time.
- Group related channels with `NotificationChannelGroup`.

## 3. FCM message types

| Type | Payload | Delivered when app is backgrounded |
| --- | --- | --- |
| **Notification message** | `notification` key | System tray shows it; `onMessageReceived` is **not** called |
| **Data message** | `data` key only | `onMessageReceived` **is** called; you build the notification |
| **Both** | both keys | System shows the notification; data arrives in the launch intent |

**Use data-only messages** when you need to control the notification, localise it client-side, decrypt content, or update local state. Send `priority: "high"` for anything time-sensitive, or Doze will defer it.

```kotlin
class AppMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(msg: RemoteMessage) {
        // Runs on a background thread, ~10-20s budget. Enqueue anything slow.
        val data = msg.data
        if (data["type"] == "transaction") {
            showTransactionNotification(data)
            WorkManager.getInstance(this).enqueue(refreshWorkRequest())
        }
    }
    override fun onNewToken(token: String) { /* register with your backend */ }
}
```

Do not do long work in `onMessageReceived` — enqueue a worker. -> `background-work.md`

## 4. Token lifecycle

Tokens rotate. A stale token means silently undelivered notifications.

- Register in `onNewToken` **and** on every sign-in.
- Delete the token server-side on sign-out — otherwise the next user of the device gets the previous user's notifications. This is a real privacy incident, not a theoretical one.
- Re-register after app restore to a new device, and after clearing app data.
- Store the token association server-side per user **and** per device.

## 5. Payload security

- **Never put sensitive data in a notification payload.** No balances, no full account numbers, no OTPs. Notifications appear on the lock screen and pass through Google's servers.
- Send an identifier; fetch the detail in-app after authentication.
- Set `visibility = VISIBILITY_PRIVATE` and provide a redacted public version for the lock screen.
- Treat the payload as untrusted input — validate before acting on it.

## 6. Tapping through

```kotlin
val intent = Intent(ctx, MainActivity::class.java).apply {
    data = "https://example.com/txn/$id".toUri()
    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
}
val pending = PendingIntent.getActivity(
    ctx, id.hashCode(), intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,  // IMMUTABLE required on S+
)
```

- `FLAG_IMMUTABLE` is mandatory on Android 12+; a mutable PendingIntent is a security hole.
- Tapping must land on the **right screen with a sensible back stack** — use `TaskStackBuilder` or a deep link into a nested graph. -> `deep-links.md`
- A unique request code per notification, or `FLAG_UPDATE_CURRENT` will overwrite the wrong one.

## 7. Delivery is not guaranteed

FCM is best-effort. Doze, force-stop, battery optimisation, OEM aggressive task-killers (Xiaomi, Oppo, Huawei are notorious) and network loss all drop messages.

Therefore:
- **Never** rely on push as the only path for critical state. Always reconcile on app open.
- Use `collapse_key` for messages where only the latest matters.
- Set `time_to_live` so stale messages are not delivered hours later.
- For anything financial, the app must be able to derive the truth by fetching, with push as an accelerator only.

## 8. Testing

```bash
# Send a test message
curl -X POST https://fcm.googleapis.com/v1/projects/<id>/messages:send \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":{"token":"<device>","data":{"type":"transaction","id":"abc"},"android":{"priority":"HIGH"}}}'

adb shell dumpsys deviceidle force-idle       # verify high-priority delivery in Doze
adb shell am force-stop <pkg>                 # force-stopped app receives nothing until relaunch
```

Test: app foreground, background, killed from Recents, force-stopped, Doze, permission denied, and after a token rotation.

## 9. Anti-patterns

- Requesting `POST_NOTIFICATIONS` at first launch
- One channel for everything
- Sensitive data in the payload
- Long work in `onMessageReceived`
- Token not deleted on sign-out
- Mutable `PendingIntent`
- Notification tap landing with an empty back stack
- Relying on push as the sole source of truth
- No `collapse_key`/`ttl` on high-volume messages
- Assuming delivery on every device

## 10. Checklist

- [ ] `POST_NOTIFICATIONS` requested in context, all outcomes handled
- [ ] Channels split by user-meaningful category; importance decided deliberately
- [ ] Data-only messages where client control is needed; `priority: high` where time-sensitive
- [ ] No sensitive content in payloads; lock-screen visibility set
- [ ] Token registered on `onNewToken` and sign-in; **deleted on sign-out**
- [ ] `FLAG_IMMUTABLE` on all PendingIntents; unique request codes
- [ ] Tap lands on the right screen with a synthesised back stack
- [ ] State reconciled on app open, independent of push
- [ ] Tested foregrounded, backgrounded, killed, force-stopped, and in Doze
