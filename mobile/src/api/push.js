import { api } from "./client";

// The mobile app's own path (deviceTokenModel.js) — an FCM registration
// token, not the browser Web Push subscription frontend/src/api/push.js
// posts to /push/subscribe. See backend/utils/fcmPush.js.
export const registerDevice = ({ token, platform }) => api.post("/push/device/register", { token, platform });

export const unregisterDevice = (token) => api.post("/push/device/unregister", { token });
