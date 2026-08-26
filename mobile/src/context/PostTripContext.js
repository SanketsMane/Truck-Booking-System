import { createContext, useContext, useState } from "react";

const PostTripContext = createContext(null);

const initialDraft = {
  fromPoint: { address: "", lat: null, lng: null },
  toPoint: { address: "", lat: null, lng: null },
  fromCity: "",
  toCity: "",
  departureAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  estimatedArrivalAt: null,
  totalCapacity: "",
  availableCapacity: "",
  pricePerTon: "",
  pickupPoint: { address: "", lat: null, lng: null },
  dropPoint: { address: "", lat: null, lng: null },
};

// Holds the in-progress trip across the 4 wizard screens (mirrors
// PostTrip.jsx's role on the web, minus its sessionStorage persistence —
// an acceptable v1 simplification since a backgrounded/killed app losing
// an in-progress trip draft is a much smaller cost on mobile, where the
// OS rarely kills a foregrounded app mid-flow the way a browser tab reload
// would lose React state on web).
export const PostTripProvider = ({ children }) => {
  const [draft, setDraft] = useState(initialDraft);
  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  return <PostTripContext.Provider value={{ draft, updateDraft }}>{children}</PostTripContext.Provider>;
};

export const usePostTripDraft = () => {
  const ctx = useContext(PostTripContext);
  if (!ctx) throw new Error("usePostTripDraft must be used within a PostTripProvider");
  return ctx;
};
