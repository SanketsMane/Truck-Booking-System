import { api } from "./client";

export const getPaymentLogForBooking = (bookingId) => api.get(`/payment-logs/booking/${bookingId}`);

export const listPaymentLogs = ({ status } = {}) =>
  api.get(`/payment-logs${status ? `?status=${status}` : ""}`);

export const setPaymentLog = ({ bookingId, amount, status }) =>
  api.post("/payment-logs", { bookingId, amount, status });
