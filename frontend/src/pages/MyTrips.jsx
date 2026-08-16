import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { listMyTrips } from "../api/trips";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Pagination } from "../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../components/ui/Table";
import { SkeletonTableRows } from "../components/ui/Skeleton";
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

export const MyTrips = () => {
  const navigate = useNavigate();
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

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <Stack $gap={5}>
        <Row style={{ justifyContent: "space-between" }}>
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
              onClick={() => {
                setTab(t.value);
                setPage(1);
              }}
            >
              {t.label}
            </Button>
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

        <Card $padding="0">
          {!loading && paged.length === 0 ? (
            <EmptyState style={{ margin: 20 }}>
              <Muted>No trips {search ? "match this search" : "in this category yet"}.</Muted>
            </EmptyState>
          ) : (
            <>
              <TableScroll>
                <Table $minWidth="760px">
                  <thead>
                    <tr>
                      <IndexTh>#</IndexTh>
                      <Th>Route</Th>
                      <Th>Departure</Th>
                      <Th>Booked / Total</Th>
                      <Th>Price/ton</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows rows={pageSize > 10 ? 10 : pageSize} cols={6} />
                    ) : (
                      paged.map((trip, i) => (
                        <Tr
                          key={trip._id}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/trips/${trip._id}/manage`)}
                        >
                          <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <Td>
                            {trip.fromCity} → {trip.toCity}
                          </Td>
                          <Td>{formatDateTime(trip.departureAt)}</Td>
                          <Td>
                            {formatTons(trip.totalCapacity - trip.availableCapacity)} / {formatTons(trip.totalCapacity)}
                          </Td>
                          <Td>{formatINR(trip.pricePerTon)}</Td>
                          <Td>
                            <StatusBadge status={trip.status} />
                          </Td>
                        </Tr>
                      ))
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
      </Stack>
    </PageContainer>
  );
};

export default MyTrips;
