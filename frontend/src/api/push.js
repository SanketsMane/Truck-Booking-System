import { api } from "./client";

export const getVapidPublicKey = () => api.get("/meta/vapid-public-key");

export const subscribePush = (subscription) => api.post("/push/subscribe", subscription);

export const unsubscribePush = (endpoint) => api.post("/push/unsubscribe", { endpoint });
