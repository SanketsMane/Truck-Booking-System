import { Platform } from "react-native";
import { secureGet, secureSet } from "./secureStorage";

const DEVICE_ID_KEY = "truckgee.deviceId";

// Not security-relevant (authController.js's deviceFields comment is
// explicit about this) — purely a stable-per-install label for a future
// "manage devices" screen, so it doesn't need real UUID-grade randomness or
// an extra native module (expo-crypto) just for this.
const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let cachedDeviceId = null;
const getDeviceId = async () => {
  if (cachedDeviceId) return cachedDeviceId;
  let id = await secureGet(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    await secureSet(DEVICE_ID_KEY, id);
  }
  cachedDeviceId = id;
  return id;
};

// { deviceId, deviceInfo, platform } — spread into authController.js's
// login/signup calls (see deviceFields in authValidation.js).
export const getDevice = async () => ({
  deviceId: await getDeviceId(),
  deviceInfo: `${Platform.OS} ${Platform.Version}`,
  platform: Platform.OS === "ios" ? "ios" : "android",
});
