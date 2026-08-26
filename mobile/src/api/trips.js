import { api } from "./client";

export const searchTrips = ({ fromCity, toCity, fromLat, fromLng, toLat, toLng, date, minCapacity, sort, rangeDays }) => {
  const params = new URLSearchParams({ fromCity, toCity, date });
  if (minCapacity) params.set("minCapacity", minCapacity);
  if (sort) params.set("sort", sort);
  if (rangeDays) params.set("rangeDays", rangeDays);
  if (fromLat != null && fromLng != null) {
    params.set("fromLat", fromLat);
    params.set("fromLng", fromLng);
  }
  if (toLat != null && toLng != null) {
    params.set("toLat", toLat);
    params.set("toLng", toLng);
  }
  return api.get(`/trips/search?${params}`);
};

export const getPopularRoutes = () => api.get("/trips/popular-routes");

export const listMyTrips = ({ status } = {}) => api.get(`/trips/me${status ? `?status=${status}` : ""}`);

export const saveSearchAlert = ({ fromCity, toCity, date }) => api.post("/trips/search-alerts", { fromCity, toCity, date });

export const postTrip = (trip) => api.post("/trips", trip);

export const getTrip = (id) => api.get(`/trips/${id}`);

export const editTrip = (id, updates) => api.put(`/trips/${id}`, updates);

export const cancelTrip = (id) => api.del(`/trips/${id}`);
