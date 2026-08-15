import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocationBroadcaster } from "./useLocationBroadcaster";
import { postTripLocation } from "../api/trips";

vi.mock("../api/trips", () => ({
  postTripLocation: vi.fn(() => Promise.resolve({ success: true })),
}));

// watchPosition's callback is invoked directly by the test (no real GPS in
// jsdom) — the hook itself decides whether a given callback firing should
// actually reach the network based on MIN_POST_INTERVAL_MS.
const fireFix = (coords) => {
  const [watchCallback] = navigator.geolocation.watchPosition.mock.calls.at(-1);
  watchCallback({ coords });
};

const coords = (lat) => ({ latitude: lat, longitude: 73.8, accuracy: 10, heading: 90, speed: 5 });

describe("useLocationBroadcaster", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postTripLocation.mockClear();
    navigator.geolocation = {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("posts the first GPS fix immediately", () => {
    const { result } = renderHook(() => useLocationBroadcaster("trip-1"));
    act(() => result.current.start());

    act(() => fireFix(coords(18.5)));

    expect(postTripLocation).toHaveBeenCalledTimes(1);
    expect(postTripLocation).toHaveBeenCalledWith("trip-1", expect.objectContaining({ lat: 18.5, lng: 73.8 }));
  });

  it("drops fixes that arrive faster than the minimum post interval", () => {
    const { result } = renderHook(() => useLocationBroadcaster("trip-1"));
    act(() => result.current.start());

    act(() => fireFix(coords(18.5)));
    // A burst of fixes 1s apart — watchPosition can fire far more often
    // than the 8s throttle while the device is actively moving.
    act(() => {
      vi.advanceTimersByTime(1000);
      fireFix(coords(18.501));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
      fireFix(coords(18.502));
    });

    expect(postTripLocation).toHaveBeenCalledTimes(1);
  });

  it("posts again once the minimum interval has elapsed", () => {
    const { result } = renderHook(() => useLocationBroadcaster("trip-1"));
    act(() => result.current.start());

    act(() => fireFix(coords(18.5)));
    act(() => {
      vi.advanceTimersByTime(8000);
      fireFix(coords(18.6));
    });

    expect(postTripLocation).toHaveBeenCalledTimes(2);
    expect(postTripLocation).toHaveBeenLastCalledWith("trip-1", expect.objectContaining({ lat: 18.6 }));
  });

  it("stop() clears the GPS watch", () => {
    const { result } = renderHook(() => useLocationBroadcaster("trip-1"));
    act(() => result.current.start());
    act(() => result.current.stop());

    expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(1);
  });
});
