import { api } from "./client";

export const getThreadForBooking = (bookingId) => api.get(`/chat/booking/${bookingId}`);

export const listMessages = (threadId) => api.get(`/chat/${threadId}/messages`);

export const sendMessage = (threadId, text) => api.post(`/chat/${threadId}/messages`, { text });

export const markThreadRead = (threadId) => api.put(`/chat/${threadId}/read`);
