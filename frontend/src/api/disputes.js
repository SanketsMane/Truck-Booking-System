import { api } from "./client";

export const raiseDispute = ({ bookingId, category, description }) =>
  api.post("/disputes", { bookingId, category, description });

export const listMyDisputes = () => api.get("/disputes/me");

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

export const listAdminDisputes = (opts) => api.get(withPaginationParams("/admin/disputes", opts));

export const resolveAdminDispute = (id, { status, resolutionAction, resolutionAmount, resolutionNote }) =>
  api.put(`/admin/disputes/${id}/resolve`, { status, resolutionAction, resolutionAmount, resolutionNote });
