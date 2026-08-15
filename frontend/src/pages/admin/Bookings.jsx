import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { listAdminBookings, forceCancelAdminBooking } from "../../api/admin";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDateTime, formatINR } from "../../utils/format";

const NON_CANCELLABLE = ["cancelled", "completed", "rejected", "expired"];

export const Bookings = () => {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    listAdminBookings({ page, limit: 20, status: status || undefined, search: search || undefined }).then((res) => {
      setBookings(res.items || []);
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
  }, [page, status, search]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
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
    <PageContainer style={{ maxWidth: 1220 }}>
      <PageTitle>Bookings</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by shipper, transporter, route, goods…"
            value={search}
            onChange={handleFilterChange(setSearch)}
            style={{ maxWidth: 300 }}
          />
          <Select value={status} onChange={handleFilterChange(setStatus)} style={{ maxWidth: 170 }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </Select>
        </Row>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : bookings.length === 0 ? (
          <EmptyState>
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
                  {bookings.map((b, i) => (
                    <Tr key={b._id}>
                      <IndexTd>{(page - 1) * 20 + i + 1}</IndexTd>
                      <Td>{b.trip ? `${b.trip.fromCity} → ${b.trip.toCity}` : "—"}</Td>
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
                          onClick={() => setTarget(b)}
                        >
                          Force cancel
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>

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
