import { api } from "./client";

export const listNotificationCategories = () => api.get("/notifications/categories");

export const listMyNotifications = ({ unreadOnly } = {}) =>
  api.get(`/notifications/me${unreadOnly ? "?unreadOnly=true" : ""}`);

export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.put("/notifications/read-all");
