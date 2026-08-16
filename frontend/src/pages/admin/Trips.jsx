import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { listAdminTrips, deactivateAdminTrip } from "../../api/admin";
import { PageContainer, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import {
  Toolbar,
  AdminSearchInput,
  AdminSelect,
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
import { formatDateTime, formatINR } from "../../utils/format";

const NON_DEACTIVATABLE = ["cancelled", "completed"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const Trips = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const hasFilters = Boolean(search || status);

  const load = () =>
    listAdminTrips({ page, limit: pageSize, search: search || undefined, status: status || undefined }).then((res) => {
      setTrips(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    });

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      load()
        .catch((error) => {
          if (!cancelled) toast.error(error.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, status]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const handleDeactivate = async (reason) => {
    setSubmitting(true);
    try {
      await deactivateAdminTrip(target._id, reason);
      toast.success("Trip deactivated");
      setTarget(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1220 }}>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by city or transporter…"
          value={search}
          onChange={handleFilterChange(setSearch)}
        />
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="full">Full</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} trip{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && trips.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No trips match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="900px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Route</Th>
                    <Th>Transporter</Th>
                    <Th>Truck</Th>
                    <Th>Departure</Th>
                    <Th>Capacity</Th>
                    <Th>Price/t</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={9} />
                  ) : (
                    trips.map((t, i) => (
                      <Tr key={t._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>
                          {t.fromCity} → {t.toCity}
                        </Td>
                        <Td>
                          {t.transporter ? (
                            <Link to={`/admin/users/${t.transporter._id}`}>{t.transporter.name}</Link>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>{t.truck?.regNumber || "—"}</Td>
                        <Td>{formatDateTime(t.departureAt)}</Td>
                        <Td>
                          {t.availableCapacity}/{t.totalCapacity}t
                        </Td>
                        <Td>{formatINR(t.pricePerTon)}</Td>
                        <Td>
                          <StatusBadge status={t.status} />
                        </Td>
                        <Td>
                          <Button
                            $variant="danger"
                            $size="sm"
                            disabled={NON_DEACTIVATABLE.includes(t.status)}
                            onClick={() => setTarget(t)}
                          >
                            Deactivate
                          </Button>
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
                  variant="admin"
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
      </AdminCard>

      <ConfirmModal
        open={!!target}
        title="Deactivate this trip?"
        description={target ? `${target.fromCity} → ${target.toCity} will be cancelled and pulled from search results.` : ""}
        requireReason
        reasonLabel="Reason for deactivation"
        confirmLabel="Deactivate trip"
        danger
        submitting={submitting}
        onConfirm={handleDeactivate}
        onCancel={() => setTarget(null)}
      />
    </PageContainer>
  );
};

export default Trips;
