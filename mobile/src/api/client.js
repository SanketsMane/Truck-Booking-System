import { secureGet, secureSet, secureDelete } from "../utils/secureStorage";

// Same backend as the web app (frontend/src/api/client.js) — every domain
// endpoint (trips, bookings, trucks, chat, verification, ratings,
// notifications, support, disputes, content, meta, files) is reused
// verbatim. The one real difference is auth: the web app rides on an
// httpOnly cookie via credentials:"include"; this app has no cookie jar to
// share, so it identifies itself with X-Client-Type: mobile (which makes
// login/signup additionally return a bearer token pair — see
// authController.issueMobileTokens) and attaches Authorization: Bearer on
// every request instead.
//
// EXPO_PUBLIC_* env vars are inlined at build time (Expo's env convention —
// see .env.example). The Android emulator can't reach the host machine via
// "localhost" (it needs 10.0.2.2); a physical device needs your machine's
// LAN IP. iOS Simulator is the only target where "localhost" works as-is.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const ACCESS_TOKEN_KEY = "truckgee.accessToken";
const REFRESH_TOKEN_KEY = "truckgee.refreshToken";

export const getStoredTokens = async () => {
  const [accessToken, refreshToken] = await Promise.all([
    secureGet(ACCESS_TOKEN_KEY),
    secureGet(REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
};

export const storeTokens = async ({ accessToken, refreshToken }) => {
  await Promise.all([secureSet(ACCESS_TOKEN_KEY, accessToken), secureSet(REFRESH_TOKEN_KEY, refreshToken)]);
};

export const clearTokens = async () => {
  await Promise.all([secureDelete(ACCESS_TOKEN_KEY), secureDelete(REFRESH_TOKEN_KEY)]);
};

// AuthContext registers a handler here once it's mounted, so a session that
// can no longer be refreshed (refresh token expired/revoked/reused) clears
// itself and sends the user back to the login screen instead of every
// subsequent call just failing silently.
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

// Concurrent requests that all 401 at once (e.g. a screen firing several
// fetches on mount with a just-expired access token) must trigger exactly
// ONE refresh call, not one per request — every caller awaits this same
// in-flight promise instead of racing the refresh endpoint.
let refreshPromise = null;
const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = await getStoredTokens();
    if (!refreshToken) throw new ApiError("No session", 401);

    const res = await fetch(`${BASE_URL}/auth/mobile/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.tokens) {
      throw new ApiError(data?.msg || "Session expired", res.status);
    }
    await storeTokens(data.tokens);
    return data.tokens.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const request = async (path, { method = "GET", body, isForm = false, _isRetry = false } = {}) => {
  const { accessToken } = await getStoredTokens();

  const headers = isForm
    ? { Accept: "application/json" }
    : { "Content-Type": "application/json", Accept: "application/json" };
  headers["X-Client-Type"] = "mobile";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (res.status === 401 && !_isRetry && accessToken) {
    // Only worth a silent-refresh-and-retry once — a second 401 right after
    // a successful refresh means the resource itself is unauthorized for
    // this user, not that the token was stale.
    try {
      await refreshAccessToken();
      return request(path, { method, body, isForm, _isRetry: true });
    } catch {
      await clearTokens();
      unauthorizedHandler?.();
      throw new ApiError("Session expired — please log in again", 401);
    }
  }

  if (!res.ok || !contentType.includes("application/json")) {
    const message = (data && data.msg) || res.statusText || "Something went wrong";
    if (res.status === 401) unauthorizedHandler?.();
    throw new ApiError(message, res.status, data);
  }

  return data;
};

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path, body) => request(path, { method: "DELETE", body }),
  upload: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
};

// Same shape as the web client's helper — shared by every paginated list
// endpoint, skips any filter that's undefined/null/empty.
export const withPaginationParams = (path, { page, limit, ...filters } = {}) => {
  const params = new URLSearchParams();
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

// Authenticated binary GET (KYC/truck documents) — same Bearer header as
// request() above, returns a fetchable local URI the caller can hand to an
// <Image>/document viewer. No blob: object URLs on native — RN's fetch
// response.blob() + a data/file URI is the equivalent; simplest correct
// approach is to hand back the raw Response for the caller to read via
// blob()/base64 as the specific viewer needs.
export const fetchFile = async (path) => {
  const { accessToken } = await getStoredTokens();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!res.ok) throw new ApiError("Could not load file", res.status);
  return res;
};
