export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// AuthContext registers a handler here once it's mounted (inside the
// router), so a 401 from ANY call — not just the initial profile check —
// can clear the stale session and send the user back to /login instead of
// leaving them stuck on a page re-showing "Invalid token" on every retry.
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

const request = async (path, { method = "GET", body, isForm = false } = {}) => {
  // Explicit Accept — the reverse proxy (see nginx config) routes a request
  // under /bookings, /trips etc. to the FRONTEND instead of this API
  // whenever its Accept header contains "text/html" (that's the mechanism
  // that lets a hard refresh/deep link on an SPA route correctly re-serve
  // index.html rather than 404). fetch() has no explicit Accept by
  // default, and while that's normally fine, this pins it so this call can
  // never ambiguously match that rule and get served the app shell instead
  // of JSON — which silently parsed as text and crashed on the
  // destructured field it expected, rather than failing loudly.
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: isForm
      ? { Accept: "application/json" }
      : { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

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

// Builds a `?page=&limit=&...filters` query string, skipping any filter
// that's undefined/null/empty — shared by every paginated list endpoint
// (originally admin.js-only, lifted here once content.js needed the exact
// same query-building for the public post list).
export const withPaginationParams = (path, { page, limit, ...filters } = {}) => {
  const params = new URLSearchParams();
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

// For binary GETs (KYC/truck documents) — fetch as a blob under the same
// credentialed session rather than relying on <img crossorigin> cookie
// behavior, which is unreliable across dev ports.
export const fetchBlobUrl = async (path) => {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new ApiError("Could not load file", res.status);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

// Same fetch as fetchBlobUrl, but also returns the blob's MIME type — an
// inline previewer needs this to decide <img> vs <iframe> vs a fallback
// "download" link before it has anywhere to point a <src> at.
export const fetchBlob = async (path) => {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new ApiError("Could not load file", res.status);
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), type: blob.type };
};

// For CSV report downloads — triggers a normal browser download using the
// credentialed session (a plain <a href> wouldn't carry the auth cookie
// cross-origin in all browsers, so we fetch + save via an object URL).
export const downloadFile = async (path, filename) => {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new ApiError("Could not download file", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
