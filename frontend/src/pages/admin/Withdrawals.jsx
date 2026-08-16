import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  listAdminWithdrawals,
  approveAdminWithdrawal,
  rejectAdminWithdrawal,
  markAdminWithdrawalPaid,
} from "../../api/admin";
import { PageContainer, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import {
  Toolbar,
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
import { formatINR, formatDateTime } from "../../utils/format";

const payoutDetail = (request) =>
  request.payoutMethod === "bank"
    ? `${request.bankDetails?.accountHolderName || "—"} · ${request.bankDetails?.accountNumber || "—"} (${request.bankDetails?.ifscCode || "—"})`
    : request.upiId || "—";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const Withdrawals = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);

  const hasFilters = Boolean(status);

  const load = () =>
    listAdminWithdrawals({ page, limit: pageSize, status }).then((res) => {
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load()
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  const handleApprove = async (request) => {
    setActingId(request._id);
    try {
      await approveAdminWithdrawal(request._id);
      toast.success("Withdrawal approved");
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setActingId(rejectTarget._id);
    try {
      await rejectAdminWithdrawal(rejectTarget._id, reason);
      toast.success("Withdrawal rejected — funds returned to wallet");
      setRejectTarget(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActingId(null);
    }
  };

  const handleMarkPaid = async (payoutReference) => {
    if (!payTarget) return;
    setActingId(payTarget._id);
    try {
      await markAdminWithdrawalPaid(payTarget._id, payoutReference);
      toast.success("Withdrawal marked as paid");
      setPayTarget(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActingId(null);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1220 }}>
      <Toolbar>
        <AdminSelect
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && status !== "pending" && <ClearFiltersButton onClick={() => setStatus("pending")} />}
        {!loading && <ResultsCount>{total} request{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No withdrawal requests match this filter.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="1080px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Date</Th>
                    <Th>Transporter</Th>
                    <Th>Amount (₹)</Th>
                    <Th>Payout to</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                  ) : (
                    items.map((request, i) => (
                      <Tr key={request._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>{formatDateTime(request.createdAt)}</Td>
                        <Td>{request.transporter?.name || request.transporter?.email || "—"}</Td>
                        <Td>{formatINR(request.amount)}</Td>
                        <Td style={{ fontSize: 12.5 }}>{payoutDetail(request)}</Td>
                        <Td>
                          <StatusBadge status={request.status} />
                        </Td>
                        <Td>
                          <Row $gap={1} $wrap>
                            {request.status === "pending" && (
                              <Button
                                $size="sm"
                                $variant="secondary"
                                disabled={actingId === request._id}
                                onClick={() => handleApprove(request)}
                              >
                                Approve
                              </Button>
                            )}
                            {(request.status === "pending" || request.status === "approved") && (
                              <>
                                <Button
                                  $size="sm"
                                  disabled={actingId === request._id}
                                  onClick={() => setPayTarget(request)}
                                >
                                  Mark paid
                                </Button>
                                {request.status === "pending" && (
                                  <Button
                                    $size="sm"
                                    $variant="danger"
                                    disabled={actingId === request._id}
                                    onClick={() => setRejectTarget(request)}
                                  >
                                    Reject
                                  </Button>
                                )}
                              </>
                            )}
                          </Row>
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
        open={Boolean(rejectTarget)}
        title="Reject withdrawal"
        description={rejectTarget ? `${formatINR(rejectTarget.amount)} will be returned to the transporter's wallet.` : ""}
        requireReason
        reasonLabel="Reason"
        confirmLabel="Reject"
        danger
        submitting={actingId === rejectTarget?._id}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmModal
        open={Boolean(payTarget)}
        title="Mark withdrawal as paid"
        description="Confirm you've transferred this amount outside the app, then record the reference for reconciliation."
        requireReason
        reasonLabel="Payout reference (UTR / transaction ID)"
        confirmLabel="Mark paid"
        submitting={actingId === payTarget?._id}
        onConfirm={handleMarkPaid}
        onCancel={() => setPayTarget(null)}
      />
    </PageContainer>
  );
};

export default Withdrawals;
