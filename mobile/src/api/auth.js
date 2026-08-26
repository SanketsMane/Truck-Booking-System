import { api, storeTokens, clearTokens } from "./client";

// Every call below hits the exact same endpoints as frontend/src/api/
// auth.js — the only difference is client.js's request() already attaches
// X-Client-Type: mobile and the Bearer header, so the response additionally
// carries `tokens` on login/signup, which AuthContext persists via
// storeTokens.
export const requestOtp = (email) => api.post("/auth/request-otp", { email });

export const checkOtp = ({ email, otp }) => api.post("/auth/check-otp", { email, otp });

export const verifyOtp = async ({ email, otp, name, mobile, city, roles, device }) => {
  const res = await api.post("/auth/verify-otp", { email, otp, name, mobile, city, roles, ...device });
  if (res.tokens) await storeTokens(res.tokens);
  return res;
};

export const signup = async ({ name, mobile, email, password, confirmPassword, roles, device }) => {
  const res = await api.post("/auth/signup", { name, mobile, email, password, confirmPassword, roles, ...device });
  if (res.tokens) await storeTokens(res.tokens);
  return res;
};

export const loginPassword = async ({ email, password, device }) => {
  const res = await api.post("/auth/login-password", { email, password, ...device });
  if (res.tokens) await storeTokens(res.tokens);
  return res;
};

// Revokes just this device's refresh token (backend/controllers/
// authController.js's mobileLogout) — unlike the web session's logout(),
// this doesn't require a still-valid access token and doesn't touch any
// other device's session.
export const logout = async (refreshToken) => {
  try {
    if (refreshToken) await api.post("/auth/mobile/logout", { refreshToken });
  } finally {
    await clearTokens();
  }
};

export const addRole = (role) => api.post("/auth/roles", { role });

export const getProfile = () => api.get("/auth/profile");

export const updateProfile = (updates) => api.put("/auth/profile", updates);

export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });

export const setPassword = ({ currentPassword, newPassword, confirmPassword }) =>
  api.put("/auth/set-password", { currentPassword, newPassword, confirmPassword });

// Real per-device session management (backend/controllers/
// authController.js's listMySessions/revokeSession) — the account-facing
// counterpart to logout()'s single-device revoke above.
export const listSessions = () => api.get("/auth/mobile/sessions");

export const revokeSession = (id) => api.del(`/auth/mobile/sessions/${id}`);
