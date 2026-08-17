import { api } from "./client";

// truck may include a `photos: [{fileId}]` array alongside `documents`.
export const registerTruck = (truck) => api.post("/trucks", truck);

export const listMyTrucks = () => api.get("/trucks/me");

export const updateTruck = (id, updates) => api.put(`/trucks/${id}`, updates);

export const addTruckDocuments = (id, documents) =>
  api.post(`/trucks/${id}/documents`, { documents });

export const addTruckPhotos = (id, fileIds) =>
  api.post(`/trucks/${id}/photos`, { photos: fileIds.map((fileId) => ({ fileId })) });

export const listTruckQueue = ({ status = "pending" } = {}) =>
  api.get(`/trucks/queue?status=${status}`);

export const reviewTruck = (id, { status, reason }) =>
  api.put(`/trucks/${id}/review`, { status, reason });

export const raiseTruckDeleteRequest = (id, reason) => api.post(`/trucks/${id}/delete-request`, { reason });

export const listMyTruckDeleteRequests = () => api.get("/trucks/delete-requests/me");
