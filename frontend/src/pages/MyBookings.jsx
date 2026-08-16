import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { listMyBookings } from "../api/bookings";
import { getTrip } from "../api/trips";
import { PageContainer, Muted, Row, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Pagination } from "../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../components/ui/Table";
import { SkeletonTableRows } from "../components/ui/Skeleton";
import { Toolbar, SearchInput, ToolbarSpacer, ResultsCount, ClearFiltersButton } from "../components/ui/Toolbar";
import { formatINR, formatTons } from "../utils/format";

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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

export const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      {availableRoles.length > 1 && (
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          {ROLE_TABS.filter((t) => availableRoles.includes(t.key)).map((t) => (
            <TabButton
              key={t.key}
              type="button"
              $active={role === t.key}
              onClick={() => {
                setRole(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </TabButton>
          ))}
        </Row>
      )}

      <Row $gap={2} $wrap style={{ marginBottom: 20 }}>
        {STATUS_TABS.map((t) => (
          <TabButton
            key={t.key}
            type="button"
            $active={statusTab === t.key}
            onClick={() => {
              setStatusTab(t.key);
              setPage(1);
            }}
          >
            {t.label}
            {grouped[t.key].length ? ` (${grouped[t.key].length})` : ""}
          </TabButton>
        ))}
      </Row>

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

      <Card $padding="0">
        {!loading && paged.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>
              No {activeStatusTab.label.toLowerCase()} bookings {role === "shipper" ? "as a shipper" : "as a transporter"}
              {search ? " match this search" : ""}.
            </Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="820px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Route</Th>
                    <Th>Departure</Th>
                    <Th>Capacity</Th>
                    <Th>Price</Th>
                    <Th>{role === "shipper" ? "Transporter" : "Shipper"}</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                  ) : (
                    paged.map((b, i) => {
                      const trip = b.trip;
                      const counterpartyLabel = b.counterparty === undefined ? "Loading…" : b.counterparty?.name || "—";
                      return (
                        <Tr
                          key={b._id}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/bookings/${b._id}`)}
                        >
                          <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <Td>
                            {trip?.fromCity} → {trip?.toCity}
                          </Td>
                          <Td>{formatDateTime(trip?.departureAt)}</Td>
                          <Td>{formatTons(b.capacityRequested)}</Td>
                          <Td>{formatINR(b.priceEstimate)}</Td>
                          <Td>{counterpartyLabel}</Td>
                          <Td>
                            <StatusBadge status={b.status} />
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </TableScroll>
            <div style={{ padding: "0 20px 16px" }}>
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
            </div>
          </>
        )}
      </Card>
    </PageContainer>
  );
};

export default MyBookings;
