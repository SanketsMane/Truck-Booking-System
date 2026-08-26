import { api } from "./client";

export const raiseDispute = ({ bookingId, category, description }) =>
  api.post("/disputes", { bookingId, category, description });

export const listMyDisputes = () => api.get("/disputes/me");
