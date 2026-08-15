import { api } from "./client";

// role: "shipper" | "transporter" — which side of the booking this account is querying as
export const listMyBookings = ({ role = "shipper", status, tripId } = {}) => {
  const params = new URLSearchParams({ role });
  if (status) params.set("status", status);
  if (tripId) params.set("tripId", tripId);
  return api.get(`/bookings/me?${params}`);
};

export const createBooking = (booking) => api.post("/bookings", booking);

export const getBooking = (id) => api.get(`/bookings/${id}`);

export const acceptBooking = (id) => api.put(`/bookings/${id}/accept`);

export const rejectBooking = (id, reason) => api.put(`/bookings/${id}/reject`, { reason });

export const cancelBooking = (id, reason) => api.put(`/bookings/${id}/cancel`, { reason });

export const confirmPickup = (id) => api.put(`/bookings/${id}/confirm-pickup`);

export const confirmDrop = (id) => api.put(`/bookings/${id}/confirm-drop`);
