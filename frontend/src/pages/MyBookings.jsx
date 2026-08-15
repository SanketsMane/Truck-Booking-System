import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { listMyBookings } from "../api/bookings";
import { getTrip } from "../api/trips";
import { PageContainer, PageTitle, SectionTitle, Muted, Stack, Row, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";

const ROLE_TABS = [
  { key: "shipper", label: "As Shipper" },
  { key: "transporter", label: "As Transporter" },
];

const STATUS_TABS = [
  { key: "upcoming", label: "Upcoming", statuses: ["pending", "confirmed"] },
  { key: "ongoing", label: "Ongoing", statuses: ["ongoing"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "rejected", "expired"] },
];

const TabButton = styled.button`
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.textMuted)};
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
`;

const RowLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
`;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const BookingRow = ({ booking, role, counterparty }) => {
  const trip = booking.trip;
  const counterpartyLabel = counterparty === undefined ? "Loading…" : counterparty?.name || "—";

  return (
    <RowLink to={`/bookings/${booking._id}`}>
      <Card>
        <CardRow>
          <Stack $gap={1}>
            <SectionTitle>
              {trip?.fromCity} → {trip?.toCity}
            </SectionTitle>
            <Muted>{formatDateTime(trip?.departureAt)}</Muted>
          </Stack>
          <StatusBadge status={booking.status} />
        </CardRow>
        <Row $gap={4} $wrap style={{ marginTop: 12 }}>
          <Muted>{booking.capacityRequested} tons</Muted>
          <Muted>₹{booking.priceEstimate}</Muted>
          <Muted>
            {role === "shipper" ? "Transporter" : "Shipper"}: {counterpartyLabel}
          </Muted>
        </Row>
      </Card>
    </RowLink>
  );
};

export const MyBookings = () => {
  const { user } = useAuth();
  const availableRoles = user?.roles || [];
  const [role, setRole] = useState(availableRoles[0] || "shipper");
  const [statusTab, setStatusTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transporters, setTransporters] = useState({});

  useEffect(() => {
    let cancelled = false;
    listMyBookings({ role })
      .then(({ bookings }) => {
        if (!cancelled) setBookings(bookings);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  // listMyBookings only populates trip.truck and the shipper — not
  // trip.transporter — so when viewing "as shipper" we look the counterparty
  // up per trip via the public trip detail endpoint (cached per trip id).
  useEffect(() => {
    if (role !== "shipper" || !bookings.length) return;
    const tripIds = [...new Set(bookings.map((b) => b.trip?._id).filter(Boolean))].filter(
      (tid) => !(tid in transporters)
    );
    if (!tripIds.length) return;
    tripIds.forEach((tripId) => {
      getTrip(tripId)
        .then(({ trip }) => setTransporters((prev) => ({ ...prev, [tripId]: trip.transporter })))
        .catch(() => setTransporters((prev) => ({ ...prev, [tripId]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, role]);

  const grouped = useMemo(() => {
    const buckets = { upcoming: [], ongoing: [], completed: [], cancelled: [] };
    for (const b of bookings) {
      const tab = STATUS_TABS.find((t) => t.statuses.includes(b.status));
      if (tab) buckets[tab.key].push(b);
    }
    return buckets;
  }, [bookings]);

  const visible = grouped[statusTab];
  const activeStatusTab = STATUS_TABS.find((t) => t.key === statusTab);

  return (
    <PageContainer>
      <PageTitle style={{ marginBottom: 20 }}>My Bookings</PageTitle>

      {availableRoles.length > 1 && (
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          {ROLE_TABS.filter((t) => availableRoles.includes(t.key)).map((t) => (
            <TabButton key={t.key} type="button" $active={role === t.key} onClick={() => setRole(t.key)}>
              {t.label}
            </TabButton>
          ))}
        </Row>
      )}

      <Row $gap={2} $wrap style={{ marginBottom: 24 }}>
        {STATUS_TABS.map((t) => (
          <TabButton key={t.key} type="button" $active={statusTab === t.key} onClick={() => setStatusTab(t.key)}>
            {t.label}
            {grouped[t.key].length ? ` (${grouped[t.key].length})` : ""}
          </TabButton>
        ))}
      </Row>

      {loading ? (
        <Row style={{ justifyContent: "center", padding: "60px 0" }}>
          <Spinner $size={28} />
        </Row>
      ) : visible.length === 0 ? (
        <EmptyState>
          No {activeStatusTab.label.toLowerCase()} bookings {role === "shipper" ? "as a shipper" : "as a transporter"}
          .
        </EmptyState>
      ) : (
        <Stack $gap={3}>
          {visible.map((b) => (
            <BookingRow
              key={b._id}
              booking={b}
              role={role}
              counterparty={role === "shipper" ? transporters[b.trip?._id] : b.shipper}
            />
          ))}
        </Stack>
      )}
    </PageContainer>
  );
};

export default MyBookings;
