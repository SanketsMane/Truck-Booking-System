import { getVapidPublicKey, subscribePush, unsubscribePush } from "../api/push";

// Converts a URL-safe base64 VAPID public key into the Uint8Array
// applicationServerKey PushManager.subscribe() expects.
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const isPushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const getPushSubscriptionState = async () => {
  if (!isPushSupported()) return { supported: false, subscribed: false };
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return { supported: true, subscribed: Boolean(subscription) };
};

export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported in this browser");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied — allow notifications in your browser settings to enable this.");
  }

  const { publicKey } = await getVapidPublicKey();
  if (!publicKey) {
    throw new Error("Push notifications aren't configured on the server yet");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await subscribePush(subscription.toJSON());
  return subscription;
};

export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await unsubscribePush(endpoint);
};
