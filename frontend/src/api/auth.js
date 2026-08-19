import { api } from "./client";

export const requestOtp = (email) => api.post("/auth/request-otp", { email });

// Confirms a code is currently correct without creating/logging into an
// account — see backend/controllers/authController.js's checkOtp. Used by
// Signup.jsx's inline "Verify" step; verifyOtp below is what actually
// creates the account, only called once the full form is submitted.
export const checkOtp = ({ email, otp }) => api.post("/auth/check-otp", { email, otp });

export const verifyOtp = ({ email, otp, name, mobile, city, roles }) =>
  api.post("/auth/verify-otp", { email, otp, name, mobile, city, roles });

export const logout = () => api.post("/auth/logout");

export const addRole = (role) => api.post("/auth/roles", { role });

export const refreshSession = () => api.post("/auth/refresh");

export const getProfile = () => api.get("/auth/profile");

export const updateProfile = (updates) => api.put("/auth/profile", updates);

export const signup = ({ name, mobile, email, password, confirmPassword, roles }) =>
  api.post("/auth/signup", { name, mobile, email, password, confirmPassword, roles });

export const loginPassword = ({ email, password }) =>
  api.post("/auth/login-password", { email, password });

export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });

export const resetPassword = ({ token, password, confirmPassword }) =>
  api.post("/auth/reset-password", { token, password, confirmPassword });

export const setPassword = ({ currentPassword, newPassword, confirmPassword }) =>
  api.put("/auth/set-password", { currentPassword, newPassword, confirmPassword });
