import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { getMobileConfig } from "../api/meta";
import { isVersionAtLeast } from "../utils/version";

// Checked once on launch, before the auth check even runs — an app old
// enough to be force-updated, or a platform-wide maintenance window,
// shouldn't get as far as trying (and failing) to hit any other endpoint.
// Fails OPEN on a network error (the backend being briefly unreachable
// must never itself look like "you must update"), matching how every
// other best-effort check in this codebase degrades.
export const useMobileConfigGate = () => {
  const [blocked, setBlocked] = useState(null); // null = still checking
  const [reason, setReason] = useState(null); // "update" | "maintenance"

  useEffect(() => {
    (async () => {
      try {
        const { config } = await getMobileConfig();
        const installedVersion = Constants.expoConfig?.version || "0.0.0";

        if (config.maintenanceMode) {
          setReason("maintenance");
          setBlocked(true);
          return;
        }
        if (config.forceUpdate && !isVersionAtLeast(installedVersion, config.minSupportedVersion)) {
          setReason("update");
          setBlocked(true);
          return;
        }
        setBlocked(false);
      } catch {
        setBlocked(false);
      }
    })();
  }, []);

  return { blocked, reason };
};
