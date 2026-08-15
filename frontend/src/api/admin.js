import { api, downloadFile } from "./client";

export const getAdminDashboard = () => api.get("/admin/dashboard");

export const listAdminUsers = ({ search, role, status } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  return api.get(`/admin/users?${params}`);
};

export const getAdminUserDetail = (id) => api.get(`/admin/users/${id}`);

export const setAdminUserStatus = (id, { status, reason }) =>
  api.put(`/admin/users/${id}/status`, { status, reason });

export const setAdminRole = (id, { isAdmin, adminScope, reason }) =>
  api.put(`/admin/users/${id}/admin-role`, { isAdmin, adminScope, reason });

export const listLiveTrips = () => api.get("/admin/live-trips");

export const listAdminTrucks = ({ search, status } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return api.get(`/admin/trucks?${params}`);
};

export const listAdminTrips = ({ search, status } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return api.get(`/admin/trips?${params}`);
};

export const deactivateAdminTrip = (id, reason) =>
  api.put(`/admin/trips/${id}/deactivate`, { reason });

export const listAdminBookings = ({ status } = {}) =>
  api.get(`/admin/bookings${status ? `?status=${status}` : ""}`);

export const forceCancelAdminBooking = (id, reason) =>
  api.put(`/admin/bookings/${id}/force-cancel`, { reason });

export const getAdminSettings = () => api.get("/admin/settings");

export const updateAdminSettings = (settings) => api.put("/admin/settings", settings);

export const downloadAdminReport = (report) =>
  downloadFile(`/admin/reports/${report}.csv`, `${report}.csv`);

export const getIntegrations = () => api.get("/admin/integrations");

export const updateSmsIntegration = (provider, config) =>
  api.put("/admin/integrations/sms", { provider, config });

export const testSmsIntegration = (mobile) => api.post("/admin/integrations/sms/test", { mobile });

export const updateEmailIntegration = (provider, config) =>
  api.put("/admin/integrations/email", { provider, config });

export const testEmailIntegration = (to) => api.post("/admin/integrations/email/test", { to });

export const updateRazorpayIntegration = (provider, config) =>
  api.put("/admin/integrations/razorpay", { provider, config });

export const testRazorpayIntegration = () => api.post("/admin/integrations/razorpay/test", {});

export const updateCommission = (commissionPercent) =>
  api.put("/admin/settings/commission", { commissionPercent });

const withPaginationParams = (path, { page, limit, ...filters } = {}) => {
  const params = new URLSearchParams();
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

export const listAdminPayments = (opts) => api.get(withPaginationParams("/admin/payments", opts));

export const listAdminWallets = (opts) => api.get(withPaginationParams("/admin/wallets", opts));

export const adjustAdminWallet = (userId, { amount, direction, reason }) =>
  api.post(`/admin/wallets/${userId}/adjust`, { amount, direction, reason });

export const getPlatformWallet = () => api.get("/admin/platform-wallet");

export const listPlatformWalletTransactions = (opts) =>
  api.get(withPaginationParams("/admin/platform-wallet/transactions", opts));

export const listAdminWithdrawals = (opts) => api.get(withPaginationParams("/admin/withdrawals", opts));

export const approveAdminWithdrawal = (id) => api.put(`/admin/withdrawals/${id}/approve`, {});

export const rejectAdminWithdrawal = (id, reason) => api.put(`/admin/withdrawals/${id}/reject`, { reason });

export const markAdminWithdrawalPaid = (id, payoutReference) =>
  api.put(`/admin/withdrawals/${id}/mark-paid`, { payoutReference });
