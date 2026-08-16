import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getTripLocation } from "../api/trips";
import { getSocket, joinTripRoom, leaveTripRoom } from "../api/socket";
import { Card } from "./ui/Card";
import { EmptyState, Muted } from "./ui/Layout";
import { theme } from "../theme/theme";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

const MapFrame = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const MapContainer = styled.div`
  height: 260px;
  width: 100%;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    height: 380px;
  }
`;

const FreshnessBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  font-size: 12.5px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme, $stale }) => ($stale ? theme.color.warning : theme.color.textMuted)};
`;

const Dot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme, $stale }) => ($stale ? theme.color.warning : theme.color.success)};
  flex: none;
`;

const STALE_AFTER_MS = 60_000;

const createMarkerEl = () => {
  const el = document.createElement("div");
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.borderRadius = "50%";
  el.style.background = theme.color.accentBright;
  el.style.boxShadow = "0 2px 8px rgba(59,130,246,0.45), 0 0 0 3px #fff";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.transition = "transform 0.6s ease";
  el.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M2 8h11v8H2z" fill="#fff"/>' +
    '<path d="M13 11h5l3 3v2h-8z" fill="#fff" opacity="0.9"/>' +
    '<circle cx="6" cy="18" r="2" fill="#fff"/>' +
    '<circle cx="17" cy="18" r="2" fill="#fff"/>' +
    "</svg>";
  return el;
};

const formatAgo = (ms) => {
  if (ms == null) return "";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
};

const TRAIL_SOURCE = "trip-trail";
const TRAIL_LAYER = "trip-trail-line";

// Set once at module load from the build-time env var — never changes
// during the app's lifetime, so this is a plain constant rather than
// component state.
const MAP_UNAVAILABLE = !mapboxgl.accessToken;

// Live single-trip map: shows the transporter's current position (moving
// smoothly as new pings arrive over the trip's Socket.IO room) plus a
// breadcrumb trail of recent pings. Fetches the last-known snapshot via
// GET /trips/:id/location on mount so the map isn't empty while waiting
// for the next live push, same "REST for the initial state, socket for
// live updates" split BookingDetail.jsx already uses for chat history.
export const LiveTruckMap = ({ tripId }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const trailRef = useRef([]);
  const [hasPosition, setHasPosition] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  // Starts at 0, not Date.now() (an impure call during render) — harmless
  // since it's only ever compared against lastUpdatedAt (null until a real
  // position arrives), and the ticking interval below sets a real value
  // within 5s regardless.
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(!MAP_UNAVAILABLE);

  const applyTrail = () => {
    const map = mapRef.current;
    if (!map || !map.getSource(TRAIL_SOURCE)) return;
    map.getSource(TRAIL_SOURCE).setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: trailRef.current },
    });
  };

  const applyPosition = (lat, lng, recordedAt) => {
    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ element: createMarkerEl() }).setLngLat([lng, lat]).addTo(map);
      map.setCenter([lng, lat]);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    trailRef.current = [...trailRef.current, [lng, lat]].slice(-200);
    applyTrail();

    setHasPosition(true);
    setLastUpdatedAt(recordedAt ? new Date(recordedAt).getTime() : Date.now());
  };

  useEffect(() => {
    if (MAP_UNAVAILABLE) return undefined;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [78.9629, 20.5937], // India, fallback center until a fix arrives
      zoom: 4,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(TRAIL_SOURCE, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: TRAIL_LAYER,
        type: "line",
        source: TRAIL_SOURCE,
        paint: { "line-color": theme.color.accentBright, "line-width": 3, "line-opacity": 0.6 },
      });
    });

    let cancelled = false;
    getTripLocation(tripId)
      .then(({ currentLocation, recentPings }) => {
        if (cancelled) return;
        trailRef.current = (recentPings || []).map((p) => [p.lng, p.lat]);
        if (currentLocation?.coordinates?.length === 2) {
          const [lng, lat] = currentLocation.coordinates;
          map.once("load", () => applyPosition(lat, lng, currentLocation.updatedAt));
          if (map.loaded()) applyPosition(lat, lng, currentLocation.updatedAt);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    joinTripRoom(tripId);
    const socket = getSocket();
    const handler = (payload) => {
      if (String(payload.tripId) !== String(tripId)) return;
      applyPosition(payload.lat, payload.lng, payload.recordedAt);
    };
    socket?.on("trip:location", handler);

    return () => {
      cancelled = true;
      socket?.off("trip:location", handler);
      leaveTripRoom(tripId);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Ticks the "last updated Xs ago" label and the staleness flag.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  if (MAP_UNAVAILABLE) {
    return (
      <EmptyState>
        <Muted>Live map isn't configured yet.</Muted>
      </EmptyState>
    );
  }

  const stale = lastUpdatedAt != null && now - lastUpdatedAt > STALE_AFTER_MS;

  return (
    <MapFrame>
      <MapContainer ref={containerRef} />
      <FreshnessBar $stale={stale}>
        {loading ? (
          <Muted>Loading live position…</Muted>
        ) : !hasPosition ? (
          <Muted>Waiting for the transporter to start sharing their location.</Muted>
        ) : (
          <>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Dot $stale={stale} />
              {stale ? "Signal lost" : "Live"}
            </span>
            <span>Updated {formatAgo(now - lastUpdatedAt)}</span>
          </>
        )}
      </FreshnessBar>
    </MapFrame>
  );
};

export default LiveTruckMap;
