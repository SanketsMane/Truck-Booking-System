import { api } from "./client";

export const createSupportRequest = ({ subject, message, bookingId }) =>
  api.post("/support", { subject, message, bookingId });

export const listMySupportRequests = () => api.get("/support/me");

export const listAllSupportRequests = ({ status } = {}) =>
  api.get(`/support${status ? `?status=${status}` : ""}`);

export const resolveSupportRequest = (id) => api.put(`/support/${id}/resolve`);
