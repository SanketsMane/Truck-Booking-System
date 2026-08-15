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

export const submitRating = ({ bookingId, stars, reviewText }) =>
  api.post("/ratings", { bookingId, stars, reviewText });

export const listRatingsForUser = (userId) => api.get(`/ratings/user/${userId}`);

export const listFlaggedRatings = (opts) => api.get(withPaginationParams("/ratings/flagged", opts));

export const flagRating = (id) => api.put(`/ratings/${id}/flag`);

export const moderateRating = (id, action) => api.put(`/ratings/${id}/moderate`, { action });
