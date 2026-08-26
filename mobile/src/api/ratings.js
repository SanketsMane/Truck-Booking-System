import { api } from "./client";

export const submitRating = ({ bookingId, stars, reviewText }) => api.post("/ratings", { bookingId, stars, reviewText });

export const listRatingsForUser = (userId) => api.get(`/ratings/user/${userId}`);

export const flagRating = (id) => api.put(`/ratings/${id}/flag`);
