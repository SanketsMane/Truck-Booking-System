import { Fragment, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listAdminDisputes, resolveAdminDispute } from "../../api/disputes";
import { PageContainer, PageTitle, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Select, Input, Textarea } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDateTime, formatINR } from "../../utils/format";

const CATEGORY_LABELS = {
  no_show: "No-show",
  damaged_goods: "Damaged goods",
  payment_issue: "Payment issue",
  behavior: "Behavior",
  other: "Other",
};

const badgeStatus = (status) => (status === "resolved" ? "completed" : status === "rejected" ? "rejected" : "pending");

const MONEY_ACTIONS = ["refund_shipper", "payout_transporter"];

const TopTd = styled(Td)`
  vertical-align: top;
`;

const ResolveRow = styled.tr`
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

// Resolution needs several correlated fields (status + action + amount +
// note) — more structure than ConfirmModal's single reason string, so it's
// an inline expanding row directly in the table instead.
const ResolutionForm = ({ dispute, onCancel, onSubmit, submitting }) => {
  const [status, setStatus] = useState("resolved");
  const [resolutionAction, setResolutionAction] = useState("none");
  const [resolutionAmount, setResolutionAmount] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const needsAmount = MONEY_ACTIONS.includes(resolutionAction);

  const handleSubmit = () => {
    if (!resolutionNote.trim()) {
      toast.error("Add a resolution note");
      return;
    }
    if (needsAmount && !(Number(resolutionAmount) > 0)) {
      toast.error("Enter an amount for this action");
      return;
    }
    onSubmit(dispute._id, {
      status,
      resolutionAction,
      resolutionAmount: needsAmount ? Number(resolutionAmount) : undefined,
      resolutionNote: resolutionNote.trim(),
    });
  };

  return (
    <ResolveRow>
      <Td colSpan={8}>
        <Stack $gap={3} style={{ padding: "12px 4px" }}>
          <Row $gap={3} $wrap>
            <div style={{ minWidth: 160 }}>
              <Field label="Outcome">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected (not valid)</option>
                </Select>
              </Field>
            </div>
            <div style={{ minWidth: 220 }}>
              <Field label="Action">
                <Select value={resolutionAction} onChange={(e) => setResolutionAction(e.target.value)}>
                  <option value="none">No action</option>
                  <option value="refund_shipper">Refund shipper</option>
                  <option value="payout_transporter">Extra payout to transporter</option>
                  <option value="warning_issued">Warning issued</option>
                  <option value="account_suspended">Account suspended</option>
                </Select>
              </Field>
            </div>
            {needsAmount && (
              <div style={{ minWidth: 140 }}>
                <Field label="Amount (INR)">
                  <Input
                    type="number"
                    min="1"
                    value={resolutionAmount}
                    onChange={(e) => setResolutionAmount(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </Row>
          <Field label="Resolution note">
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="What was decided and why — visible to both parties"
            />
          </Field>
          <Row $gap={2}>
            <Button $size="sm" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Submitting…" : "Submit resolution"}
            </Button>
            <Button type="button" $variant="ghost" $size="sm" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          </Row>
        </Stack>
      </Td>
    </ResolveRow>
  );
};

export const Disputes = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const load = () =>
    listAdminDisputes({ page, limit: 20, status: status || undefined }).then((res) => {
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
  }, [page, status]);

  const handleResolve = async (id, payload) => {
    setSubmittingId(id);
    try {
      await resolveAdminDispute(id, payload);
      toast.success("Dispute resolved");
      setExpandedId(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1180 }}>
      <PageTitle>Disputes</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 190 }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </Row>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : items.length === 0 ? (
          <EmptyState>
            <Muted>No disputes match this filter.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="1080px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Raised</Th>
                    <Th>Category</Th>
                    <Th>Raised by</Th>
                    <Th>Against</Th>
                    <Th>Booking</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((d, i) => (
                    <Fragment key={d._id}>
                      <Tr>
                        <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * 20 + i + 1}</IndexTd>
                        <TopTd>{formatDateTime(d.createdAt)}</TopTd>
                        <TopTd>
                          <strong>{CATEGORY_LABELS[d.category] || d.category}</strong>
                          <br />
                          <Muted style={{ maxWidth: 240, display: "inline-block" }}>{d.description}</Muted>
                        </TopTd>
                        <TopTd>
                          {d.raisedBy?.name || "—"}
                          <br />
                          <Muted>{d.raisedBy?.mobile || ""}</Muted>
                        </TopTd>
                        <TopTd>
                          {d.againstUser?.name || "—"}
                          <br />
                          <Muted>{d.againstUser?.mobile || ""}</Muted>
                        </TopTd>
                        <TopTd>
                          <Muted>
                            {d.booking?.goodsDescription || d.booking?._id || "—"}
                            {d.booking?.priceEstimate ? ` · ${formatINR(d.booking.priceEstimate)}` : ""}
                          </Muted>
                        </TopTd>
                        <TopTd>
                          <StatusBadge status={badgeStatus(d.status)}>{d.status.replace(/_/g, " ")}</StatusBadge>
                        </TopTd>
                        <TopTd>
                          {!["resolved", "rejected"].includes(d.status) && (
                            <Button
                              $size="sm"
                              onClick={() => setExpandedId(expandedId === d._id ? null : d._id)}
                            >
                              {expandedId === d._id ? "Close" : "Resolve"}
                            </Button>
                          )}
                        </TopTd>
                      </Tr>
                      {expandedId === d._id && (
                        <ResolutionForm
                          dispute={d}
                          submitting={submittingId === d._id}
                          onCancel={() => setExpandedId(null)}
                          onSubmit={handleResolve}
                        />
                      )}
                    </Fragment>
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

export default Disputes;
