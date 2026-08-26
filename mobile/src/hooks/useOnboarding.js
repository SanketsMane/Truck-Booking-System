import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_SEEN_KEY = "truckgee.onboardingSeen";

// Shown once, ever, on first launch — plain AsyncStorage (not secure
// storage) since this is a non-sensitive UI-state flag, not a credential.
export const useOnboarding = () => {
  const [seen, setSeen] = useState(null); // null = still checking

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((value) => setSeen(value === "true"))
      .catch(() => setSeen(true)); // fail open — never block launch over a storage read
  }, []);

  const markSeen = async () => {
    setSeen(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    } catch {
      // Storage unavailable — worst case the carousel shows again next
      // launch, not worth blocking on.
    }
  };

  return { seen, markSeen };
};
