import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { listAdminPayments } from "../../api/admin";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatINR, formatDateTime } from "../../utils/format";

// Replaces the old manual-reconciliation PaymentLog table with the real
// Razorpay/wallet payment ledger — server-side paginated and filterable
// (see adminWalletController.listPayments), the first paginated admin list
// in this app.
export const Payments = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [method, setMethod] = useState("");

  useEffect(() => {
    let cancelled = false;
    listAdminPayments({ page, limit: 20, status, purpose, method })
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
  }, [page, status, purpose, method]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1180 }}>
      <PageTitle>Payments</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Select value={status} onChange={handleFilterChange(setStatus)} style={{ maxWidth: 170 }}>
            <option value="">All statuses</option>
            <option value="created">Created</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Select>
          <Select value={purpose} onChange={handleFilterChange(setPurpose)} style={{ maxWidth: 190 }}>
            <option value="">All purposes</option>
            <option value="wallet_recharge">Wallet recharge</option>
            <option value="booking_payment">Booking payment</option>
          </Select>
          <Select value={method} onChange={handleFilterChange(setMethod)} style={{ maxWidth: 170 }}>
            <option value="">All methods</option>
            <option value="razorpay">Razorpay</option>
            <option value="wallet">Wallet</option>
          </Select>
        </Row>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : items.length === 0 ? (
          <EmptyState>
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
                  {items.map((p, i) => (
                    <Tr key={p._id}>
                      <IndexTd>{(page - 1) * 20 + i + 1}</IndexTd>
                      <Td>{formatDateTime(p.createdAt)}</Td>
                      <Td>
                        {p.user ? (
                          <Link to={`/admin/users/${p.user._id}`}>{p.user.name || p.user.mobile}</Link>
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
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </PageContainer>
  );
};

export default Payments;
