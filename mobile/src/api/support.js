import { api } from "./client";

export const createSupportRequest = ({ subject, message, bookingId }) =>
  api.post("/support", { subject, message, bookingId });

export const listMySupportRequests = () => api.get("/support/me");
