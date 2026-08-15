import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import styled from "styled-components";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { listLiveTrips } from "../../api/admin";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatRelative } from "../../utils/format";
import { theme } from "../../theme/theme";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
const MAP_UNAVAILABLE = !mapboxgl.accessToken;

const MapFrame = styled(Card)`
  padding: 0;
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
  el.style.background = theme.color.accent;
  el.style.boxShadow = "0 0 0 3px rgba(255,106,26,0.25), 0 1px 4px rgba(20,21,15,0.3)";
  return el;
};

// Fleet overview: every trip that's reported a GPS ping in the last 5
// minutes, plotted on one map plus a list. Simpler than the single-trip
// LiveTruckMap — no Socket.IO subscription per marker, just a periodic
// refetch (REFRESH_MS), which is plenty for an admin dashboard glance.
export const LiveTracking = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <PageContainer style={{ maxWidth: 1180 }}>
      <PageTitle>Live tracking</PageTitle>
      <Row $gap={2} style={{ marginTop: 6, marginBottom: 20 }}>
        <Muted>Trips that reported a GPS position in the last 5 minutes. Refreshes automatically.</Muted>
      </Row>

      {MAP_UNAVAILABLE ? (
        <EmptyState style={{ marginBottom: 20 }}>
          <Muted>Live map isn't configured yet.</Muted>
        </EmptyState>
      ) : (
        <MapFrame>
          <MapContainer ref={containerRef} />
        </MapFrame>
      )}

      <Card>
        {loading ? (
          <Row style={{ justifyContent: "center", padding: "40px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : trips.length === 0 ? (
          <EmptyState>
            <Muted>No trucks are currently sharing their location.</Muted>
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
                {trips.map((trip, i) => (
                  <Tr key={trip._id}>
                    <IndexTd>{i + 1}</IndexTd>
                    <Td>
                      <Link to={`/trips/${trip._id}`}>
                        {trip.fromCity} → {trip.toCity}
                      </Link>
                    </Td>
                    <Td>{trip.transporter?.name || trip.transporter?.mobile || "—"}</Td>
                    <Td>
                      {trip.truck?.truckType || "—"}
                      {trip.truck?.regNumber ? ` · ${trip.truck.regNumber}` : ""}
                    </Td>
                    <Td>{formatRelative(trip.currentLocation?.updatedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </PageContainer>
  );
};

export default LiveTracking;
