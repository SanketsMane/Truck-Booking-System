# Networking

The network is unreliable by default. Design for the request that half-succeeds.

## 1. Stack

**Retrofit + OkHttp + kotlinx.serialization** is the default. **Ktor** is a reasonable choice, especially with KMP. Do not add a second HTTP stack to a project that already has one. -> `project-setup.md`

```kotlin
@Provides @Singleton
fun okHttp(auth: AuthInterceptor, @ApplicationContext ctx: Context): OkHttpClient =
    OkHttpClient.Builder()
        .connectTimeout(10, SECONDS)
        .readTimeout(30, SECONDS)
        .callTimeout(60, SECONDS)          // total budget — without this a call can hang forever
        .addInterceptor(auth)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) BODY else NONE   // NEVER BODY in release
        })
        .cache(Cache(File(ctx.cacheDir, "http"), 10L * 1024 * 1024))
        .build()
```

`HttpLoggingInterceptor` at `BODY` in a release build leaks tokens, balances and PII into logcat. Guard it on `BuildConfig.DEBUG`, always.

## 2. Serialization

```kotlin
Json {
    ignoreUnknownKeys = true    // a new backend field must not crash old clients
    coerceInputValues = true
    explicitNulls = false
}
```

- `ignoreUnknownKeys = true` is mandatory. Without it, any additive backend change breaks every shipped client.
- DTOs are **nullable and permissive**; the mapping to domain is where you assert. A non-null Kotlin field on a field the backend can omit is a crash waiting for a bad deploy.
- Never share a DTO with Room or the UI. -> `architecture.md` §2

## 3. Error mapping

```kotlin
suspend fun <T> apiCall(block: suspend () -> T): Result<T> =
    try { Result.Success(block()) }
    catch (e: CancellationException) { throw e }
    catch (e: UnknownHostException)  { Result.Failure(DataError.Network) }
    catch (e: SocketTimeoutException){ Result.Failure(DataError.Timeout) }
    catch (e: HttpException) {
        when (e.code()) {
            401 -> Result.Failure(DataError.Unauthorized)
            in 400..499 -> Result.Failure(e.toApiError())   // parse the body — the reason matters
            else -> Result.Failure(DataError.Http(e.code()))
        }
    }
    catch (e: Exception) { Result.Failure(DataError.Unknown) }
```

Parse the error body. "Insufficient funds" and "Daily limit exceeded" are both HTTP 400 and need completely different UI. -> `../../mobile-product-engineer/references/error-states.md`

## 4. Timeout is not failure

This is the most important rule in this file.

A `SocketTimeoutException` on a payment means **the request may have succeeded**. Telling the user it failed, and letting them retry, is how a double charge happens.

```kotlin
suspend fun send(request: TransferRequest): Result<Transfer> =
    when (val r = apiCall { api.transfer(request) }) {
        is Result.Failure -> when (r.error) {
            DataError.Timeout -> pollStatus(request.idempotencyKey)  // ask, do not assume
            else -> r
        }
        is Result.Success -> r
    }
```

On timeout: poll the transaction status endpoint before showing any outcome. If status is unknown, show "We're confirming this payment" — never "Failed".

## 5. Idempotency

Every request that changes state carries a client-generated key, created **once** when the user reaches the confirmation step and reused across every retry.

```kotlin
data class TransferRequest(
    val amountMinor: Long,
    val recipientId: String,
    val idempotencyKey: String = UUID.randomUUID().toString(),  // generated once, at Review
)
```

- Persist the key with the pending operation so it survives process death.
- The server must return the original result for a repeated key.
- Combine with a disabled CTA on the client — belt and braces. -> `../../../examples/send-money-flow.md`

## 6. Retry and backoff

```kotlin
.retryWhen { cause, attempt ->
    val retryable = cause is IOException && cause !is SSLHandshakeException
    if (retryable && attempt < 3) { delay(1000L * (1 shl attempt.toInt())); true } else false
}
```

| Retry | Do not retry |
| --- | --- |
| Connection failures, 502/503/504, 429 (honour `Retry-After`) | 400, 401, 403, 404, 422 |
| Idempotent GETs freely | Non-idempotent writes **without** an idempotency key |

Exponential backoff with jitter. Cap attempts. Never retry a payment without an idempotency key.

## 7. Auth and token refresh

```kotlin
class TokenAuthenticator @Inject constructor(private val store: TokenStore) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null      // stop infinite loops
        val fresh = runBlocking { store.refreshBlocking() } ?: return null
        return response.request.newBuilder()
            .header("Authorization", "Bearer $fresh").build()
    }
}
```

- Use OkHttp's `Authenticator` for 401 refresh, not an interceptor — it handles the retry correctly.
- **Serialise refresh** with a mutex: ten parallel 401s must trigger one refresh, not ten.
- Guard against loops (`responseCount`).
- On refresh failure: clear the session and route to sign-in, once.
- Tokens live in encrypted storage. -> `security.md`

## 8. Connectivity

```kotlin
val online: Flow<Boolean> = callbackFlow {
    val cb = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(n: Network) { trySend(true) }
        override fun onLost(n: Network) { trySend(false) }
    }
    cm.registerNetworkCallback(NetworkRequest.Builder()
        .addCapability(NET_CAPABILITY_INTERNET)
        .addCapability(NET_CAPABILITY_VALIDATED).build(), cb)
    awaitClose { cm.unregisterNetworkCallback(cb) }
}.distinctUntilChanged()
```

`NET_CAPABILITY_VALIDATED` matters — a captive-portal wifi reports connected but has no internet. Still handle request failure regardless; connectivity state is a hint, not a guarantee.

## 9. Security

- HTTPS only; `cleartextTrafficPermitted="false"` in the network security config.
- Certificate pinning for high-value APIs, with backup pins and an expiry plan. -> `security.md`
- Never log request/response bodies in release.
- Never put tokens or PII in URLs — they land in logs and proxies.

## 10. Anti-patterns

- Logging interceptor at `BODY` in release
- `ignoreUnknownKeys = false`
- Non-null DTO fields the backend may omit
- Treating timeout as failure on a state-changing call
- Retrying a payment with no idempotency key
- Refresh implemented as an interceptor, unserialised, looping on repeated 401
- Generic "Something went wrong" for every HTTP code
- No `callTimeout` (a call can hang indefinitely)
- Sharing DTOs with Room or the UI
- Tokens in URLs or logs

## 11. Checklist

- [ ] Timeouts set, including `callTimeout`
- [ ] Logging guarded by `BuildConfig.DEBUG`
- [ ] `ignoreUnknownKeys = true`; DTOs permissive; mapping asserts
- [ ] Errors mapped to a typed hierarchy; error bodies parsed
- [ ] Timeout on state-changing calls triggers a status poll, never a "failed" screen
- [ ] Idempotency key generated once, persisted, reused on retry
- [ ] Retry policy distinguishes retryable from terminal; backoff with jitter
- [ ] Token refresh serialised, loop-guarded, failure routes to sign-in
- [ ] Cleartext disabled; pinning considered for sensitive endpoints
- [ ] Offline behaviour verified with the network actually off
