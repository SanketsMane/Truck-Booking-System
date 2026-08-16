import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Send, ThumbsUp, Truck, PackageCheck, Ban, Clock, ChevronRight, PackageSearch, SearchX, Inbox } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listMyBookings } from "../api/bookings";
import { getTrip } from "../api/trips";
import { PageContainer, PageTitle, Muted, Row, Stack, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Pagination } from "../components/ui/Pagination";
import { SkeletonBlock, SkeletonText, SkeletonCircle } from "../components/ui/Skeleton";
import { Toolbar, SearchInput, ToolbarSpacer, ResultsCount, ClearFiltersButton } from "../components/ui/Toolbar";
import { formatINR, formatTons, formatDateTime } from "../utils/format";
import { fadeInUp } from "../theme/animations";

const ROLE_TABS = [
  { key: "shipper", label: "As Shipper" },
  { key: "transporter", label: "As Transporter" },
];

const STATUS_TABS = [
  { key: "upcoming", label: "Upcoming", statuses: ["pending", "confirmed"], icon: Clock },
  { key: "ongoing", label: "Ongoing", statuses: ["ongoing"], icon: Truck },
  { key: "completed", label: "Completed", statuses: ["completed"], icon: PackageCheck },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "rejected", "expired"], icon: Ban },
];

// Same status vocabulary/iconography as BookingStatusTimeline (the detail
// page's stepper) — this list is the "glance" version of that timeline, one
// icon per row instead of the full step-by-step breakdown.
const STATUS_ICONS = {
  pending: Send,
  confirmed: ThumbsUp,
  ongoing: Truck,
  completed: PackageCheck,
  rejected: Ban,
  cancelled: Ban,
  expired: Ban,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const TabPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme, $active }) => ($active ? theme.color.accentStrong : theme.color.textMuted)};
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
  transition: border-color ${({ theme }) => theme.motion.fast} ease, background ${({ theme }) => theme.motion.fast} ease,
    color ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    border-color: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.borderStrong)};
  }
`;

const TabCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.surfaceRaised)};
  color: ${({ theme, $active }) => ($active ? theme.color.onAccent : theme.color.textMuted)};
`;

const BookingList = styled(Stack).attrs({ $gap: 2 })``;

const BookingCard = styled(Card).attrs({ $padding: "0" })`
  display: block;
  overflow: hidden;
  animation: ${fadeInUp} 0.3s ease both;
  animation-delay: ${({ $i = 0 }) => Math.min($i * 0.04, 0.3)}s;
`;

const BookingRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  flex-wrap: wrap;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-wrap: nowrap;
  }
`;

// Mirrors BookingStatusTimeline's Dot — same color-from-status logic, just
// keyed by the booking's single current status rather than stepped progress.
const StatusIconWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme, $status }) => {
    const key = theme.status[$status] || "textMuted";
    return theme.color[`${key}Soft`] ?? theme.color.surfaceRaised;
  }};
  color: ${({ theme, $status }) => {
    const key = theme.status[$status] || "textMuted";
    return theme.color[key] ?? theme.color.textMuted;
  }};
`;

const Divider = styled.div`
  width: 1px;
  align-self: stretch;
  background: ${({ theme }) => theme.color.border};
  flex-shrink: 0;
`;

const InfoCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
`;

const RouteLine = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.color.text};
`;

const SideCol = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-top: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(1)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-shrink: 0;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    width: auto;
    min-width: 130px;
    border-top: none;
    padding-top: 0;
    margin-top: 0;
    gap: 6px;
  }
`;

const PriceValue = styled.div`
  font-weight: 800;
  font-size: 16px;
  color: ${({ theme }) => theme.color.accent};
`;

const ChevronCol = styled.div`
  display: none;
  align-items: center;
  color: ${({ theme }) => theme.color.textFaint};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: flex;
  }
`;

// Mirrors BookingRow's real layout (status icon / divider / route+counterparty
// / price+status) so the loading state previews the eventual shape instead
// of a generic spinner.
const BookingSkeletonRow = () => (
  <Card $padding="0">
    <BookingRow>
      <SkeletonCircle $size="44px" />
      <Divider />
      <InfoCol>
        <SkeletonText $width="150px" />
        <SkeletonBlock $width="120px" $height="12px" />
        <Row $gap={2}>
          <SkeletonCircle $size="20px" />
          <SkeletonBlock $width="100px" $height="12px" />
        </Row>
      </InfoCol>
      <SideCol>
        <SkeletonText $width="70px" $size="16px" />
        <SkeletonBlock $width="50px" $height="12px" />
        <SkeletonBlock $width="64px" $height="20px" $radius="999px" />
      </SideCol>
    </BookingRow>
  </Card>
);

export const MyBookings = () => {
  const { user } = useAuth();
  const availableRoles = user?.roles || [];
  const [role, setRole] = useState(availableRoles[0] || "shipper");
  const [statusTab, setStatusTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transporters, setTransporters] = useState({});

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
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

  const withCounterparty = useMemo(
    () =>
      bookings.map((b) => ({
        ...b,
        counterparty: role === "shipper" ? transporters[b.trip?._id] : b.shipper,
      })),
    [bookings, role, transporters]
  );

  const grouped = useMemo(() => {
    const buckets = { upcoming: [], ongoing: [], completed: [], cancelled: [] };
    for (const b of withCounterparty) {
      const tab = STATUS_TABS.find((t) => t.statuses.includes(b.status));
      if (tab) buckets[tab.key].push(b);
    }
    return buckets;
  }, [withCounterparty]);

  const visible = grouped[statusTab];
  const activeStatusTab = STATUS_TABS.find((t) => t.key === statusTab);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((b) => {
      const trip = b.trip;
      const haystack = [trip?.fromCity, trip?.toCity, b.counterparty?.name, b.goodsDescription]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visible, search]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <Stack $gap={5}>
        <Stack $gap={1}>
          <PageTitle>My Bookings</PageTitle>
          <Muted>Track requests, pickups and deliveries in one place.</Muted>
        </Stack>

        <Stack $gap={2}>
          {availableRoles.length > 1 && (
            <Row $gap={2} $wrap>
              {ROLE_TABS.filter((t) => availableRoles.includes(t.key)).map((t) => (
                <TabPill
                  key={t.key}
                  type="button"
                  $active={role === t.key}
                  onClick={() => {
                    setRole(t.key);
                    setPage(1);
                  }}
                >
                  {t.label}
                </TabPill>
              ))}
            </Row>
          )}

          <Row $gap={2} $wrap>
            {STATUS_TABS.map((t) => {
              const TabIcon = t.icon;
              const count = grouped[t.key].length;
              const active = statusTab === t.key;
              return (
                <TabPill
                  key={t.key}
                  type="button"
                  $active={active}
                  onClick={() => {
                    setStatusTab(t.key);
                    setPage(1);
                  }}
                >
                  <TabIcon size={14} strokeWidth={2.4} />
                  {t.label}
                  {count > 0 && <TabCount $active={active}>{count}</TabCount>}
                </TabPill>
              );
            })}
          </Row>
        </Stack>

        <Stack $gap={3}>
          <Toolbar>
            <SearchInput
              placeholder="Search by route or name…"
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
            {!loading && <ResultsCount>{total} booking{total === 1 ? "" : "s"}</ResultsCount>}
          </Toolbar>

          {loading ? (
            <BookingList>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <BookingSkeletonRow key={i} />
              ))}
            </BookingList>
          ) : paged.length === 0 ? (
            <EmptyState>
              {bookings.length === 0 ? (
                <>
                  <PackageSearch size={26} strokeWidth={1.6} />
                  <Muted>
                    {role === "shipper"
                      ? "You haven't booked any capacity yet."
                      : "You don't have any booking requests yet."}
                  </Muted>
                  <Button as={Link} to={role === "shipper" ? "/" : "/trips/new"} $size="sm">
                    {role === "shipper" ? "Find a truck" : "Post a trip"}
                  </Button>
                </>
              ) : search ? (
                <>
                  <SearchX size={26} strokeWidth={1.6} />
                  <Muted>No {activeStatusTab.label.toLowerCase()} bookings match "{search}".</Muted>
                </>
              ) : (
                <>
                  <Inbox size={26} strokeWidth={1.6} />
                  <Muted>
                    No {activeStatusTab.label.toLowerCase()} bookings {role === "shipper" ? "as a shipper" : "as a transporter"} right now.
                  </Muted>
                </>
              )}
            </EmptyState>
          ) : (
            <>
              <BookingList>
                {paged.map((b, i) => {
                  const trip = b.trip;
                  const counterpartyLabel = b.counterparty === undefined ? "Loading…" : b.counterparty?.name || "—";
                  const StatusIcon = STATUS_ICONS[b.status] || Clock;
                  return (
                    <BookingCard as={Link} to={`/bookings/${b._id}`} key={b._id} $i={i} $interactive>
                      <BookingRow>
                        <StatusIconWrap $status={b.status}>
                          <StatusIcon size={18} strokeWidth={2.2} />
                        </StatusIconWrap>

                        <Divider />

                        <InfoCol>
                          <RouteLine>
                            {trip?.fromCity} → {trip?.toCity}
                          </RouteLine>
                          <Muted>Departs {formatDateTime(trip?.departureAt)}</Muted>
                          <Row $gap={2}>
                            <Avatar name={b.counterparty?.name} size={20} />
                            <Muted>
                              {counterpartyLabel} · {role === "shipper" ? "Transporter" : "Shipper"}
                            </Muted>
                          </Row>
                        </InfoCol>

                        <SideCol>
                          <PriceValue>{formatINR(b.priceEstimate)}</PriceValue>
                          <Muted>{formatTons(b.capacityRequested)}</Muted>
                          <StatusBadge status={b.status} />
                        </SideCol>

                        <ChevronCol>
                          <ChevronRight size={20} strokeWidth={2.2} />
                        </ChevronCol>
                      </BookingRow>
                    </BookingCard>
                  );
                })}
              </BookingList>

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
            </>
          )}
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default MyBookings;
