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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
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
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
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
