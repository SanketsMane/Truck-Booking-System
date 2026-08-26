import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store (iOS Keychain / Android Keystore) is unavailable on web
// (docs.expo.dev/versions/v57.0.0/sdk/securestore — "supported only on
// Android, iOS, tvOS, and Expo Go"). `expo start --web` is a dev-preview
// convenience this app can still boot under, not a real ship target — a
// plain localStorage fallback there is fine; the two real targets (iOS/
// Android) always get the actual secure, encrypted-at-rest storage.
const isWeb = Platform.OS === "web";

export const secureSet = async (key, value) => {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

export const secureGet = async (key) => {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

export const secureDelete = async (key) => {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};
