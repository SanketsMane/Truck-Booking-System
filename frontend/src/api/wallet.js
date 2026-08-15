import { api } from "./client";

const withPaginationParams = (path, { page, limit } = {}) => {
  const params = new URLSearchParams();
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

export const getMyWallet = () => api.get("/wallet/me");

export const listMyTransactions = (opts) => api.get(withPaginationParams("/wallet/transactions", opts));

export const createRechargeOrder = (amount) => api.post("/wallet/recharge/order", { amount });

export const verifyRecharge = (payload) => api.post("/wallet/recharge/verify", payload);

export const requestWithdrawal = (payload) => api.post("/wallet/withdrawals", payload);

export const listMyWithdrawals = (opts) => api.get(withPaginationParams("/wallet/withdrawals", opts));

export const createBookingWalletPayment = (bookingId) => api.post(`/bookings/${bookingId}/pay/wallet`, {});

export const createBookingRazorpayOrder = (bookingId) => api.post(`/bookings/${bookingId}/pay/razorpay/order`, {});

export const verifyBookingRazorpayPayment = (bookingId, payload) =>
  api.post(`/bookings/${bookingId}/pay/razorpay/verify`, payload);
