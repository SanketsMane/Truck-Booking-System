import { api } from "./client";

// fromCity, toCity, date are required; minCapacity, minVolumeCbm, sort ("price"|"departure"|"rating"), rangeDays are optional
export const searchTrips = ({ fromCity, toCity, date, minCapacity, minVolumeCbm, sort, rangeDays }) => {
  const params = new URLSearchParams({ fromCity, toCity, date });
  if (minCapacity) params.set("minCapacity", minCapacity);
  if (minVolumeCbm) params.set("minVolumeCbm", minVolumeCbm);
  if (sort) params.set("sort", sort);
  if (rangeDays) params.set("rangeDays", rangeDays);
  return api.get(`/trips/search?${params}`);
};

export const getPopularRoutes = () => api.get("/trips/popular-routes");

export const listMyTrips = ({ status } = {}) =>
  api.get(`/trips/me${status ? `?status=${status}` : ""}`);

export const saveSearchAlert = ({ fromCity, toCity, date }) =>
  api.post("/trips/search-alerts", { fromCity, toCity, date });

export const postTrip = (trip) => api.post("/trips", trip);

export const getTrip = (id) => api.get(`/trips/${id}`);

export const editTrip = (id, updates) => api.put(`/trips/${id}`, updates);

export const cancelTrip = (id) => api.del(`/trips/${id}`);

export const getTripLocation = (id) => api.get(`/trips/${id}/location`);

export const postTripLocation = (id, payload) => api.put(`/trips/${id}/location`, payload);
