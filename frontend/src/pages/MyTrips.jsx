import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { listMyTrips } from "../api/trips";
import { PageContainer, Stack, Row, PageTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { formatDateTime, formatINR, formatTons } from "../utils/format";

const TABS = [
  { label: "All", value: undefined },
  { label: "Published", value: "published" },
  { label: "Full", value: "full" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const TabRow = styled(Row)`
  overflow-x: auto;
  padding-bottom: 4px;
`;

const TripRow = styled(Card)`
  display: block;
`;

export const MyTrips = () => {
  const [tab, setTab] = useState(TABS[0].value);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMyTrips({ status: tab })
      .then(({ trips }) => {
        if (!cancelled) setTrips(trips || []);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <PageContainer>
      <Stack $gap={5}>
        <Row style={{ justifyContent: "space-between" }}>
          <PageTitle>My Trips</PageTitle>
          <Button as={Link} to="/trips/new" $size="sm">
            Post a trip
          </Button>
        </Row>

        <TabRow $gap={2}>
          {TABS.map((t) => (
            <Button
              key={t.label}
              type="button"
              $size="sm"
              $variant={tab === t.value ? "primary" : "ghost"}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </TabRow>

        {loading ? (
          <Row $gap={2}>
            <Spinner />
            <Muted>Loading your trips…</Muted>
          </Row>
        ) : trips.length === 0 ? (
          <EmptyState>No trips in this category yet.</EmptyState>
        ) : (
          <Stack $gap={3}>
            {trips.map((trip) => (
              <TripRow as={Link} to={`/trips/${trip._id}/manage`} key={trip._id}>
                <Stack $gap={2}>
                  <CardRow>
                    <strong>
                      {trip.fromCity} → {trip.toCity}
                    </strong>
                    <StatusBadge status={trip.status} />
                  </CardRow>
                  <Row $gap={4} $wrap>
                    <Muted>{formatDateTime(trip.departureAt)}</Muted>
                    <Muted>
                      {formatTons(trip.totalCapacity - trip.availableCapacity)} / {formatTons(trip.totalCapacity)} booked
                    </Muted>
                    <Muted>{formatINR(trip.pricePerTon)}/t</Muted>
                  </Row>
                </Stack>
              </TripRow>
            ))}
          </Stack>
        )}
      </Stack>
    </PageContainer>
  );
};

export default MyTrips;
