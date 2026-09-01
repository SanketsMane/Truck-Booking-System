# Payments

Two different worlds with different rules: **digital goods** (Play Billing is mandatory) and **real-world goods and money movement** (Play Billing is prohibited).

## 1. Which one applies

| Selling | Use | Play's position |
| --- | --- | --- |
| Subscriptions, in-app currency, premium features, digital content | **Google Play Billing** | Mandatory |
| Physical goods, ride-hailing, food delivery, tickets | Any PSP (Razorpay, Stripe, …) | Play Billing prohibited |
| Peer-to-peer transfers, wallet top-up, bill payment, remittance | UPI / bank rails / PSP | Play Billing prohibited |

Getting this wrong is an app suspension, not a warning. If it is genuinely ambiguous — a digital service consumed outside the app, for instance — flag it rather than guessing.

## 2. Play Billing

```kotlin
billingClient.launchBillingFlow(activity, BillingFlowParams.newBuilder()
    .setProductDetailsParamsList(listOf(params)).build())
```

The rules that matter:

1. **Verify server-side.** The client tells your server the purchase token; your server calls the Play Developer API to confirm. Never grant entitlement on a client-side callback — it is trivially spoofed.
2. **Acknowledge within 3 days** (`acknowledgePurchase`, or `consumeAsync` for consumables) or Google **automatically refunds** the purchase and the user loses access. This is the single most common Play Billing bug.
3. **Query on every launch.** `queryPurchasesAsync` — purchases complete outside your app (pending payments, parental approval, a purchase made while the app was killed).
4. **Handle pending purchases** (`PENDING` state) — cash and some regional methods settle later. Do not grant entitlement until `PURCHASED`.
5. Entitlement lives **server-side**, keyed to the user account, not on the device. A user reinstalling or switching devices must keep what they bought.
6. Use Real-time Developer Notifications (RTDN) via Pub/Sub for renewals, cancellations, refunds and grace periods. Polling misses state changes.
7. Handle `BillingResponseCode.SERVICE_DISCONNECTED` with reconnect and backoff.

Test with licence testers and Play's test cards in an internal-testing track. Static test SKUs no longer cover modern flows.

## 3. UPI (India)

Two integration styles:

**Intent-based** — hands off to the user's UPI app:

```xml
<queries>
    <intent><action android:name="android.intent.action.VIEW" />
        <data android:scheme="upi" /></intent>
</queries>
```

Without that `<queries>` block, `resolveActivity` returns null on Android 11+ and no UPI app is found. -> `permissions-and-privacy.md` §5

```kotlin
val uri = Uri.parse("upi://pay").buildUpon()
    .appendQueryParameter("pa", vpa)
    .appendQueryParameter("pn", payeeName)
    .appendQueryParameter("am", amount)
    .appendQueryParameter("cu", "INR")
    .appendQueryParameter("tr", transactionRef)   // your reference
    .build()
```

**The result is never authoritative.** The intent result can be lost, spoofed or simply not returned when the user swipes the app away mid-payment. Always confirm status from your server, which confirms with the PSP.

**PSP SDK-based** (Razorpay, PhonePe SDK, Paytm) — a hosted flow. Same rule: server confirms.

## 4. The rules that apply to every payment path

1. **The server is the source of truth.** The client displays what the server says happened. Never mark a payment successful on a client signal alone.
2. **Idempotency key** generated once at the review step, persisted, reused on every retry. -> `networking.md` §5
3. **Double-submit impossible**: disable the CTA on tap **and** rely on the idempotency key. Two defences, because one fails.
4. **Timeout is not failure.** Poll status. Never show "Failed" when the payment may have succeeded. -> `networking.md` §4
5. **Survive process death mid-payment.** Persist the pending payment with its idempotency key before launching any external flow; on relaunch, resume by polling status. The user may be sent to a bank app, an OTP screen, or simply switch away.
6. **Reconcile on app open.** Any pending payment older than N minutes gets its status checked.
7. Never store card numbers, CVVs or UPI PINs. Ever. Tokenise via the PSP.
8. Amounts as integer minor units end to end. -> `../../mobile-product-engineer/references/fintech-ux.md`

## 5. The state machine

```
Idle → Authorising → Submitted → [Pending] → Succeeded
                          ↓          ↓
                       Failed     Unknown ──poll──▶ Succeeded | Failed
```

`Unknown` is a **required** state, not an edge case. It is what a timeout or a lost callback produces, and the UI for it is "We're confirming this payment", never "Failed".

Persist the current state so a process death lands back in the right place.

## 6. Receipts and reconciliation

- Store the server's reference/UTR id locally, and show it copyably. -> `../../../examples/transaction-screen.md`
- Never generate a reference client-side and present it as authoritative.
- Support and dispute flows depend on that id — make it easy to copy and share.

## 7. Testing

- Sandbox credentials for the PSP; Play licence testers for Billing.
- Force these paths explicitly: network drop after submit, app killed mid-flow, duplicate tap, expired session, insufficient funds, bank decline, user cancels in the external app, delayed webhook.
- Verify the idempotency key actually prevents a second charge — send the same request twice.
- Verify acknowledgement timing for Play Billing (the 3-day refund rule).

## 8. Anti-patterns

- Client-side purchase verification
- Not acknowledging a Play purchase within 3 days
- Entitlement stored on the device rather than the account
- Ignoring `PENDING` purchases
- Trusting a UPI intent result
- Missing `<queries>` for UPI apps
- No idempotency key on a payment
- Timeout rendered as "Failed"
- Payment state lost on process death
- Play Billing used for physical goods, or a PSP used for digital goods
- Storing card or PIN data

## 9. Checklist

- [ ] Correct rail chosen for what is being sold
- [ ] Play Billing: server-verified, acknowledged in time, queried on launch, RTDN wired
- [ ] Entitlement server-side, keyed to the account
- [ ] `PENDING` purchases handled
- [ ] UPI: `<queries>` declared; intent result never trusted
- [ ] Idempotency key generated once, persisted, reused
- [ ] Double-submit blocked by both CTA state and key
- [ ] Timeout triggers status polling; `Unknown` state implemented
- [ ] Pending payment survives process death and is reconciled on launch
- [ ] No card/CVV/PIN stored anywhere
- [ ] Failure paths actually exercised, not assumed
