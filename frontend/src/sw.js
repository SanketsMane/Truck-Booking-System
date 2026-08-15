import { precacheAndRoute } from "workbox-precaching";

// Required by injectManifest — this is where vite-plugin-pwa's build step
// substitutes the actual list of app-shell files to precache.
precacheAndRoute(self.__WB_MANIFEST);

// registerType: "autoUpdate" (vite.config.js) relies on this — the
// auto-injected registration script posts this message to a newly-installed
// worker once it's ready, and the generateSW strategy handled the reply
// automatically; a hand-written injectManifest source has to do it itself,
// or updates would install but never actually activate.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "ShareTruck", {
      body: data.body,
      icon: "/icons/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"));
});
