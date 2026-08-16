import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ChevronRight, Truck } from "lucide-react";
import { listMyTrips } from "../api/trips";
import { PageContainer, Stack, Row, PageTitle, Muted, EmptyState } from "../components/ui/Layout";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardRow } from "../components/ui/Card";
import { Pagination } from "../components/ui/Pagination";
import { SkeletonBlock, SkeletonText } from "../components/ui/Skeleton";
import { Toolbar, SearchInput, ToolbarSpacer, ResultsCount, ClearFiltersButton } from "../components/ui/Toolbar";
import { formatDateTime, formatINR, formatTons } from "../utils/format";

const TABS = [
  { label: "All", value: undefined },
  { label: "Published", value: "published" },
  { label: "Full", value: "full" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const TabRow = styled(Row)`
  overflow-x: auto;
  padding-bottom: 4px;
`;

const TabPill = styled.button`
  flex: none;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.textMuted)};
  font-weight: 700;
  font-size: 13.5px;
  white-space: nowrap;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
  }
`;

const TripHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
`;

const RouteText = styled.div`
  font-weight: 700;
  font-size: 15.5px;
  color: ${({ theme }) => theme.color.text};
`;

const CapacityBarTrack = styled.div`
  height: 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surfaceRaised};
  overflow: hidden;
`;

const CapacityBarFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.color.accent};
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
`;

const TripFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(1)};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const PriceText = styled.span`
  font-weight: 800;
  font-size: 15px;
  color: ${({ theme }) => theme.color.accent};
`;

const PriceUnit = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textFaint};
  margin-left: 4px;
`;

// Shape-matched loading placeholder for one trip card — mirrors the real
// card's structure (route + status, capacity bar, price row) rather than a
// generic spinner, same reasoning as SearchResults' ResultSkeletonRow.
const TripCardSkeleton = () => (
  <Card>
    <Stack $gap={3}>
      <TripHead>
        <Stack $gap={2} style={{ flex: 1 }}>
          <SkeletonText $width="45%" $size="15.5px" />
          <SkeletonBlock $width="35%" $height="12px" />
        </Stack>
        <SkeletonBlock $width="64px" $height="20px" $radius="999px" />
      </TripHead>
      <SkeletonBlock $height="7px" $radius="999px" />
      <SkeletonBlock $width="120px" $height="14px" />
    </Stack>
  </Card>
);

export const MyTrips = () => {
  const [tab, setTab] = useState(TABS[0].value);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) => `${trip.fromCity} ${trip.toCity}`.toLowerCase().includes(q));
  }, [trips, search]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const skeletonCount = pageSize > 10 ? 10 : pageSize;

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <Stack $gap={5}>
        <Row style={{ justifyContent: "space-between" }} $gap={3} $wrap>
          <Stack $gap={1}>
            <PageTitle>My trips</PageTitle>
            <Muted>Trips you've posted, and how each one is doing.</Muted>
          </Stack>
          <Button as={Link} to="/trips/new" $size="sm">
            Post a trip
          </Button>
        </Row>

        <TabRow $gap={2}>
          {TABS.map((t) => (
            <TabPill
              key={t.label}
              type="button"
              $active={tab === t.value}
              onClick={() => {
                setTab(t.value);
                setPage(1);
              }}
            >
              {t.label}
            </TabPill>
          ))}
        </TabRow>

        <Toolbar>
          <SearchInput
            placeholder="Search by route…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <ToolbarSpacer />
          {search && (
            <ClearFiltersButton
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            />
          )}
          {!loading && <ResultsCount>{total} trip{total === 1 ? "" : "s"}</ResultsCount>}
        </Toolbar>

        {!loading && paged.length === 0 ? (
          <EmptyState>
            <Truck size={26} strokeWidth={1.8} />
            <Muted>No trips {search ? "match this search" : "in this category yet"}.</Muted>
            {!search && trips.length === 0 && (
              <Button as={Link} to="/trips/new" $size="sm">
                Post your first trip
              </Button>
            )}
          </EmptyState>
        ) : (
          <Stack $gap={3}>
            {loading
              ? Array.from({ length: skeletonCount }).map((_, i) => <TripCardSkeleton key={i} />)
              : paged.map((trip) => {
                  const bookedCapacity = trip.totalCapacity - trip.availableCapacity;
                  const pct = trip.totalCapacity
                    ? Math.min(100, Math.round((bookedCapacity / trip.totalCapacity) * 100))
                    : 0;
                  return (
                    <Card key={trip._id} as={Link} to={`/trips/${trip._id}/manage`} $interactive>
                      <Stack $gap={3}>
                        <TripHead>
                          <Stack $gap={1}>
                            <RouteText>
                              {trip.fromCity} → {trip.toCity}
                            </RouteText>
                            <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>
                            {trip.truck && (
                              <Muted>
                                {trip.truck.truckType}
                                {trip.truck.regNumber ? ` · ${trip.truck.regNumber}` : ""}
                              </Muted>
                            )}
                          </Stack>
                          <StatusBadge status={trip.status} />
                        </TripHead>

                        <Stack $gap={2}>
                          <CardRow>
                            <Muted>Booked</Muted>
                            <strong>
                              {formatTons(bookedCapacity)} / {formatTons(trip.totalCapacity)}
                            </strong>
                          </CardRow>
                          <CapacityBarTrack>
                            <CapacityBarFill $pct={pct} />
                          </CapacityBarTrack>
                        </Stack>

                        <TripFooter>
                          <div>
                            <PriceText>{formatINR(trip.pricePerTon)}</PriceText>
                            <PriceUnit>/ ton</PriceUnit>
                          </div>
                          <ChevronRight size={18} strokeWidth={2.2} />
                        </TripFooter>
                      </Stack>
                    </Card>
                  );
                })}
          </Stack>
        )}

        {!loading && (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        )}
      </Stack>
    </PageContainer>
  );
};

export default MyTrips;
