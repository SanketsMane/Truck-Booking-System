import { api } from "./client";

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

export const createSupportRequest = ({ subject, message, bookingId }) =>
  api.post("/support", { subject, message, bookingId });

export const listMySupportRequests = () => api.get("/support/me");

export const listAllSupportRequests = (opts) => api.get(withPaginationParams("/support", opts));

export const resolveSupportRequest = (id) => api.put(`/support/${id}/resolve`);
