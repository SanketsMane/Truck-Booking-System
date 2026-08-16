import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { listAdminPayments } from "../../api/admin";
import { PageContainer, Muted, EmptyState } from "../../components/ui/Layout";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import {
  Toolbar,
  AdminSelect,
  AdminDateInput,
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
import { formatINR, formatDateTime } from "../../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Replaces the old manual-reconciliation PaymentLog table with the real
// Razorpay/wallet payment ledger — server-side paginated and filterable
// (see adminWalletController.listPayments), the first paginated admin list
// in this app.
export const Payments = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const hasFilters = Boolean(status || purpose || method || from || to);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    listAdminPayments({ page, limit: pageSize, status, purpose, method, from: from || undefined, to: to || undefined })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, status, purpose, method, from, to]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus("");
    setPurpose("");
    setMethod("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1220 }}>
      <Toolbar>
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </AdminSelect>
        <AdminSelect value={purpose} onChange={handleFilterChange(setPurpose)}>
          <option value="">All purposes</option>
          <option value="wallet_recharge">Wallet recharge</option>
          <option value="booking_payment">Booking payment</option>
        </AdminSelect>
        <AdminSelect value={method} onChange={handleFilterChange(setMethod)}>
          <option value="">All methods</option>
          <option value="razorpay">Razorpay</option>
          <option value="wallet">Wallet</option>
        </AdminSelect>
        <AdminDateInput value={from} onChange={handleFilterChange(setFrom)} title="From date" aria-label="From date" />
        <AdminDateInput value={to} onChange={handleFilterChange(setTo)} title="To date" aria-label="To date" />
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} payment{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No payments match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="1080px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Date</Th>
                    <Th>User</Th>
                    <Th>Purpose</Th>
                    <Th>Method</Th>
                    <Th>Amount (₹)</Th>
                    <Th>Status</Th>
                    <Th>Razorpay order</Th>
                    <Th>Booking</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={9} />
                  ) : (
                    items.map((p, i) => (
                      <Tr key={p._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>{formatDateTime(p.createdAt)}</Td>
                        <Td>
                          {p.user ? (
                            <Link to={`/admin/users/${p.user._id}`}>{p.user.name || p.user.email}</Link>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>{p.purpose === "wallet_recharge" ? "Wallet recharge" : "Booking payment"}</Td>
                        <Td style={{ textTransform: "capitalize" }}>{p.method}</Td>
                        <Td>{formatINR(p.amount)}</Td>
                        <Td>
                          <StatusBadge status={p.status} />
                        </Td>
                        <Td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.razorpayOrderId || "—"}</Td>
                        <Td>
                          {p.booking ? (
                            <Link to={`/bookings/${p.booking._id}`}>{formatINR(p.booking.priceEstimate)}</Link>
                          ) : (
                            "—"
                          )}
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
    </PageContainer>
  );
};

export default Payments;
