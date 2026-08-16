import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import styled from "styled-components";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { listLiveTrips } from "../../api/admin";
import { PageContainer, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import {
  Toolbar,
  AdminSearchInput,
  ToolbarSpacer,
  ResultsCount,
  ClearFiltersButton,
} from "../../components/ui/AdminToolbar";
import {
  TableScroll,
  Table,
  Th,
  Td,
  Tr,
  IndexTh,
  IndexTd,
  AdminCard,
  AdminSkeletonRows,
} from "../../components/ui/AdminTable";
import { formatRelative } from "../../utils/format";
import { theme } from "../../theme/theme";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
const MAP_UNAVAILABLE = !mapboxgl.accessToken;

const MapFrame = styled(Card).attrs({ $variant: "admin", $padding: "0" })`
  overflow: hidden;
  margin-bottom: 20px;
`;

const MapContainer = styled.div`
  height: 340px;
  width: 100%;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    height: 460px;
  }
`;

const REFRESH_MS = 15_000;

const createMarkerEl = () => {
  const el = document.createElement("div");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.background = theme.color.accentBright;
  el.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.25), 0 1px 4px rgba(17,19,24,0.3)";
  return el;
};

// Fleet overview: every trip that's reported a GPS ping in the last 5
// minutes, plotted on one map plus a list. Simpler than the single-trip
// LiveTruckMap — no Socket.IO subscription per marker, just a periodic
// refetch (REFRESH_MS), which is plenty for an admin dashboard glance. The
// live window naturally bounds this to a small dataset, so filtering is
// client-side and there's no pagination.
export const LiveTracking = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () =>
    listLiveTrips()
      .then(({ trips }) => setTrips(trips || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (MAP_UNAVAILABLE) return undefined;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [78.9629, 20.5937],
      zoom: 4,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const fitToTrips = (map, tripsWithLocation) => {
    const coords = tripsWithLocation.map((t) => t.currentLocation?.coordinates).filter(Boolean);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setCenter(coords[0]);
      map.setZoom(10);
      return;
    }
    const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || MAP_UNAVAILABLE) return;

    const seenIds = new Set();
    trips.forEach((trip) => {
      const coords = trip.currentLocation?.coordinates;
      if (!coords || coords.length !== 2) return;
      seenIds.add(trip._id);

      let marker = markersRef.current.get(trip._id);
      if (!marker) {
        marker = new mapboxgl.Marker({ element: createMarkerEl() }).setLngLat(coords).addTo(map);
        markersRef.current.set(trip._id, marker);
      } else {
        marker.setLngLat(coords);
      }
    });

    // Drop markers for trips that fell out of the live window.
    markersRef.current.forEach((marker, tripId) => {
      if (!seenIds.has(tripId)) {
        marker.remove();
        markersRef.current.delete(tripId);
      }
    });

    if (trips.length > 0 && !map.loaded()) {
      map.once("load", () => fitToTrips(map, trips));
    } else if (trips.length > 0) {
      fitToTrips(map, trips);
    }
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) =>
      [trip.fromCity, trip.toCity, trip.transporter?.name, trip.transporter?.email, trip.truck?.regNumber]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [search, trips]);

  return (
    <PageContainer style={{ maxWidth: 1220 }}>
      {MAP_UNAVAILABLE ? (
        <EmptyState style={{ marginBottom: 20 }}>
          <Muted>Live map isn't configured yet.</Muted>
        </EmptyState>
      ) : (
        <MapFrame>
          <MapContainer ref={containerRef} />
        </MapFrame>
      )}

      <Toolbar>
        <AdminSearchInput
          placeholder="Search by route, transporter, or reg. number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ToolbarSpacer />
        {search && <ClearFiltersButton onClick={() => setSearch("")} />}
        {!loading && (
          <ResultsCount>
            {filteredTrips.length} of {trips.length} active · refreshes every 15s
          </ResultsCount>
        )}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && filteredTrips.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>
              {trips.length === 0
                ? "No trucks are currently sharing their location."
                : "No active trips match this search."}
            </Muted>
          </EmptyState>
        ) : (
          <TableScroll>
            <Table $minWidth="760px">
              <thead>
                <tr>
                  <IndexTh>#</IndexTh>
                  <Th>Route</Th>
                  <Th>Transporter</Th>
                  <Th>Truck</Th>
                  <Th>Last updated</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminSkeletonRows rows={6} cols={5} />
                ) : (
                  filteredTrips.map((trip, i) => (
                    <Tr key={trip._id}>
                      <IndexTd>{i + 1}</IndexTd>
                      <Td>
                        <Link to={`/trips/${trip._id}`}>
                          {trip.fromCity} → {trip.toCity}
                        </Link>
                      </Td>
                      <Td>{trip.transporter?.name || trip.transporter?.email || "—"}</Td>
                      <Td>
                        {trip.truck?.truckType || "—"}
                        {trip.truck?.regNumber ? ` · ${trip.truck.regNumber}` : ""}
                      </Td>
                      <Td>{formatRelative(trip.currentLocation?.updatedAt)}</Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </AdminCard>
    </PageContainer>
  );
};

export default LiveTracking;
