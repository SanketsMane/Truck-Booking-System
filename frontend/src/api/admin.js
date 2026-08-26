import { api, downloadFile, withPaginationParams } from "./client";

export const getAdminDashboard = () => api.get("/admin/dashboard");

export const listAdminUsers = (opts) => api.get(withPaginationParams("/admin/users", opts));

export const createAdminUser = ({ name, email, password, role, adminScope }) =>
  api.post("/admin/users", { name, email, password, role, adminScope });

export const getAdminUserDetail = (id) => api.get(`/admin/users/${id}`);

export const setAdminUserStatus = (id, { status, reason }) =>
  api.put(`/admin/users/${id}/status`, { status, reason });

export const setAdminRole = (id, { isAdmin, adminScope, reason }) =>
  api.put(`/admin/users/${id}/admin-role`, { isAdmin, adminScope, reason });

export const deleteAdminUser = (id) => api.del(`/admin/users/${id}`);

export const listAdminTrucks = (opts) => api.get(withPaginationParams("/admin/trucks", opts));

export const deleteAdminTruck = (id, reason) => api.del(`/admin/trucks/${id}`, { reason });

export const listAdminTruckDeleteRequests = (opts) =>
  api.get(withPaginationParams("/admin/truck-delete-requests", opts));

export const resolveAdminTruckDeleteRequest = (id, payload) =>
  api.put(`/admin/truck-delete-requests/${id}/resolve`, payload);

export const listDeletedTrucks = (opts) => api.get(withPaginationParams("/admin/deleted-trucks", opts));

export const listAdminTrips = (opts) => api.get(withPaginationParams("/admin/trips", opts));

export const deactivateAdminTrip = (id, reason) =>
  api.put(`/admin/trips/${id}/deactivate`, { reason });

export const listAdminBookings = (opts) => api.get(withPaginationParams("/admin/bookings", opts));

export const forceCancelAdminBooking = (id, reason) =>
  api.put(`/admin/bookings/${id}/force-cancel`, { reason });

export const getAdminSettings = () => api.get("/admin/settings");

export const updateAdminSettings = (settings) => api.put("/admin/settings", settings);

export const updateMobileConfig = (config) => api.put("/admin/settings/mobile-config", config);

export const downloadAdminReport = (report) =>
  downloadFile(`/admin/reports/${report}.csv`, `${report}.csv`);

export const getIntegrations = () => api.get("/admin/integrations");

export const updateSmsIntegration = (provider, config) =>
  api.put("/admin/integrations/sms", { provider, config });

export const testSmsIntegration = (mobile) => api.post("/admin/integrations/sms/test", { mobile });

export const updateEmailIntegration = (provider, config) =>
  api.put("/admin/integrations/email", { provider, config });

export const testEmailIntegration = (to) => api.post("/admin/integrations/email/test", { to });

export const updateKycIntegration = (provider, config) =>
  api.put("/admin/integrations/kyc", { provider, config });

export const updateBranding = (branding) => api.put("/admin/settings/branding", branding);

// SRS-06.1 — read-only, for moderation (e.g. reviewing a dispute's
// conversation). Requires the "support" admin scope server-side.
export const getAdminBookingChat = (bookingId) => api.get(`/admin/bookings/${bookingId}/chat`);

export const listAuditLogs = (opts) => api.get(withPaginationParams("/admin/audit-logs", opts));

export const listAdminPosts = (opts) => api.get(withPaginationParams("/admin/posts", opts));

export const getAdminPost = (id) => api.get(`/admin/posts/${id}`);

export const createAdminPost = (payload) => api.post("/admin/posts", payload);

export const updateAdminPost = (id, payload) => api.put(`/admin/posts/${id}`, payload);

export const publishAdminPost = (id) => api.put(`/admin/posts/${id}/publish`);

export const unpublishAdminPost = (id) => api.put(`/admin/posts/${id}/unpublish`);

export const archiveAdminPost = (id) => api.put(`/admin/posts/${id}/archive`);

export const deleteAdminPost = (id) => api.del(`/admin/posts/${id}`);
