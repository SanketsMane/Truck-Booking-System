import { api } from "./client";

export const searchCities = (q) => api.get(`/meta/cities?q=${encodeURIComponent(q)}`);
