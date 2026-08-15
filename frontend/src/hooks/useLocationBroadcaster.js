import { useCallback, useEffect, useRef, useState } from "react";
import { postTripLocation } from "../api/trips";

const MIN_POST_INTERVAL_MS = 8000;

const describeGeoError = (error) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied — allow location access in your browser settings to share your position.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Couldn't determine your position — check your device's GPS/location settings.";
  }
  if (error.code === error.TIMEOUT) {
    return "Timed out getting your location — try again.";
  }
  return error.message || "Couldn't read your location.";
};

// Encapsulates the transporter's side of live tracking: watches the
// browser's GPS and POSTs to /trips/:id/location, but never more often
// than MIN_POST_INTERVAL_MS regardless of how frequently watchPosition's
// callback fires (it can fire far more often than needed while moving).
// A timestamp-gate rather than setInterval, so a burst of fast-arriving
// fixes never queues up redundant POSTs.
export const useLocationBroadcaster = (tripId) => {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const lastSentAtRef = useRef(0);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError("This browser doesn't support location sharing.");
      return;
    }
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // A successful fix proves GPS has recovered — clear any earlier
        // "couldn't determine position" error even if this particular tick
        // gets throttled below and never actually posts.
        setError(null);

        const now = Date.now();
        if (now - lastSentAtRef.current < MIN_POST_INTERVAL_MS) return;
        lastSentAtRef.current = now;

        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        postTripLocation(tripId, {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? undefined,
          heading: heading ?? undefined,
          speed: speed ?? undefined,
        }).catch((err) => setError(err.message));
      },
      (geoError) => setError(describeGeoError(geoError)),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    setIsSharing(true);
  }, [tripId]);

  // Sharing must not silently continue after the transporter navigates
  // away from the page that started it.
  useEffect(() => stop, [stop]);

  return { isSharing, start, stop, error };
};

export default useLocationBroadcaster;
