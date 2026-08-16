import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { XCircle, ArrowRight } from "lucide-react";
import { listAdminBookings, forceCancelAdminBooking } from "../../api/admin";
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

const NON_CANCELLABLE = ["cancelled", "completed", "rejected", "expired"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Same muted-icon route treatment as admin/Trips.jsx — the two pages show
// the same "fromCity → toCity" shape and should read identically.
const IconCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  svg {
    color: ${({ theme }) => theme.admin.color.textMuted};
    flex: none;
  }
`;

export const Bookings = () => {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const hasFilters = Boolean(search || status);

  const load = () =>
    listAdminBookings({ page, limit: pageSize, status: status || undefined, search: search || undefined }).then(
      (res) => {
        setBookings(res.items || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      }
    );

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
  }, [page, pageSize, status, search]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const handleForceCancel = async (reason) => {
    setSubmitting(true);
    try {
      await forceCancelAdminBooking(target._id, reason);
      toast.success("Booking cancelled");
      setTarget(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1260 }}>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by shipper, transporter, route, goods…"
          value={search}
          onChange={handleFilterChange(setSearch)}
        />
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} booking{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && bookings.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No bookings match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="1040px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Route</Th>
                    <Th>Shipper</Th>
                    <Th>Transporter</Th>
                    <Th>Goods</Th>
                    <Th>Capacity</Th>
                    <Th>Price</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={10} />
                  ) : (
                    bookings.map((b, i) => (
                      <Tr key={b._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>
                          {b.trip ? (
                            <IconCell>
                              {b.trip.fromCity} <ArrowRight size={13} strokeWidth={2.2} /> {b.trip.toCity}
                            </IconCell>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>
                          {b.shipper ? (
                            <Link to={`/admin/users/${b.shipper._id}`}>{b.shipper.name}</Link>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>
                          {b.trip?.transporter ? (
                            <Link to={`/admin/users/${b.trip.transporter._id}`}>{b.trip.transporter.name}</Link>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>{b.goodsDescription || "—"}</Td>
                        <Td>{b.capacityRequested}t</Td>
                        <Td>{formatINR(b.priceEstimate)}</Td>
                        <Td>
                          <StatusBadge status={b.status} />
                        </Td>
                        <Td>{formatDateTime(b.createdAt)}</Td>
                        <Td>
                          <Button
                            $variant="danger"
                            $size="sm"
                            disabled={NON_CANCELLABLE.includes(b.status)}
                            title={
                              NON_CANCELLABLE.includes(b.status)
                                ? `Already ${b.status} — can't be force-cancelled`
                                : undefined
                            }
                            onClick={() => setTarget(b)}
                          >
                            <XCircle size={14} strokeWidth={2.4} />
                            Force cancel
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
        title="Force-cancel this booking?"
        description="Both the shipper and transporter will be notified."
        requireReason
        reasonLabel="Reason for cancellation"
        confirmLabel="Force cancel"
        danger
        submitting={submitting}
        onConfirm={handleForceCancel}
        onCancel={() => setTarget(null)}
      />
    </PageContainer>
  );
};

export default Bookings;
