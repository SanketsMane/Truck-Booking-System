import { api } from "./client";

export const requestOtp = (mobile) => api.post("/auth/request-otp", { mobile });

export const verifyOtp = ({ mobile, otp, name, email, city, roles }) =>
  api.post("/auth/verify-otp", { mobile, otp, name, email, city, roles });

export const logout = () => api.post("/auth/logout");

export const addRole = (role) => api.post("/auth/roles", { role });

export const refreshSession = () => api.post("/auth/refresh");

export const getProfile = () => api.get("/auth/profile");

export const updateProfile = (updates) => api.put("/auth/profile", updates);

export const signup = ({ name, mobile, email, password, confirmPassword, roles }) =>
  api.post("/auth/signup", { name, mobile, email, password, confirmPassword, roles });

export const loginPassword = ({ identifier, password }) =>
  api.post("/auth/login-password", { identifier, password });

export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });

export const resetPassword = ({ token, password, confirmPassword }) =>
  api.post("/auth/reset-password", { token, password, confirmPassword });

export const setPassword = ({ currentPassword, newPassword, confirmPassword }) =>
  api.put("/auth/set-password", { currentPassword, newPassword, confirmPassword });
