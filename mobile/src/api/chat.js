import { api } from "./client";

export const listInbox = () => api.get("/chat/inbox");

export const getThread = (threadId) => api.get(`/chat/${threadId}`);

export const getThreadForBooking = (bookingId) => api.get(`/chat/booking/${bookingId}`);

export const listMessages = (threadId) => api.get(`/chat/${threadId}/messages`);

export const sendMessage = (threadId, { text, imageUrl } = {}) =>
  api.post(`/chat/${threadId}/messages`, { text: text || undefined, imageUrl });

export const markThreadRead = (threadId) => api.put(`/chat/${threadId}/read`);
