import { Fragment, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listAdminDisputes, resolveAdminDispute } from "../../api/disputes";
import { getAdminBookingChat } from "../../api/admin";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { Field, Select, Input, Textarea } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
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
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const TopTd = styled(Td)`
  vertical-align: top;
`;

const ResolveRow = styled.tr`
  background: ${({ theme }) => theme.admin.color.bg};
`;

const ChatScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 2px;
`;

const ChatBubble = styled.div`
  max-width: 78%;
  align-self: flex-start;
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.4;
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  color: ${({ theme }) => theme.admin.color.text};
`;

const ChatSender = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  margin-bottom: 3px;
`;

const ChatTime = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.admin.color.textMuted};
  margin-top: 4px;
`;

// Read-only view of a booking's chat thread, for moderation (SRS-06.1) —
// same expand-a-row pattern as ResolutionForm below, kept as a separate
// panel/state since an admin may want to read the conversation without
// necessarily resolving the dispute in the same moment.
const ChatPanel = ({ dispute, onClose }) => {
  const bookingId = dispute.booking?._id;
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState(bookingId ? "" : "This dispute isn't linked to a booking.");

  // The dispute's booking is only populated with goodsDescription/status/
  // priceEstimate (see disputeController.listAllDisputes) — no participant
  // roles. raisedBy/againstUser are already populated with name/email
  // though, and between them cover both participants in every dispute, so
  // matching a message's sender against those two (rather than guessing
  // "shipper"/"transporter") shows the actual person's name and works
  // regardless of which side raised the dispute.
  const senderName = (senderId) => {
    if (String(senderId) === String(dispute.raisedBy?._id)) return dispute.raisedBy?.name || "Sender";
    if (String(senderId) === String(dispute.againstUser?._id)) return dispute.againstUser?.name || "Sender";
    return "Sender";
  };

  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;
    getAdminBookingChat(bookingId)
      .then(({ messages }) => {
        if (!cancelled) setMessages(messages || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <ResolveRow>
      <Td colSpan={8}>
        <Stack $gap={3} style={{ padding: "12px 4px" }}>
          <Row style={{ justifyContent: "space-between" }}>
            <strong style={{ fontSize: 13.5 }}>Conversation</strong>
            <Button type="button" $variant="ghost" $size="sm" onClick={onClose}>
              Close
            </Button>
          </Row>
          {loading ? (
            <Muted>Loading…</Muted>
          ) : error ? (
            <Muted>{error}</Muted>
          ) : messages.length === 0 ? (
            <Muted>No messages in this conversation yet.</Muted>
          ) : (
            <ChatScroll>
              {messages.map((m) => (
                <ChatBubble key={m._id}>
                  <ChatSender>{senderName(m.sender)}</ChatSender>
                  {m.text}
                  <ChatTime>{new Date(m.createdAt).toLocaleString("en-IN")}</ChatTime>
                </ChatBubble>
              ))}
            </ChatScroll>
          )}
        </Stack>
      </Td>
    </ResolveRow>
  );
};

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
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [chatExpandedId, setChatExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const hasFilters = Boolean(category) || status !== "open";

  const load = () =>
    listAdminDisputes({ page, limit: pageSize, status: status || undefined, category: category || undefined }).then(
      (res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      }
    );

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
  }, [page, pageSize, status, category]);

  const clearFilters = () => {
    setStatus("open");
    setCategory("");
    setPage(1);
  };

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
          <option value="open">Open</option>
          <option value="under_review">Under review</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </AdminSelect>
        <AdminSelect
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} dispute{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
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
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    items.map((d, i) => (
                      <Fragment key={d._id}>
                        <Tr>
                          <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <TopTd>{formatDateTime(d.createdAt)}</TopTd>
                          <TopTd>
                            <strong>{CATEGORY_LABELS[d.category] || d.category}</strong>
                            <br />
                            <Muted style={{ maxWidth: 240, display: "inline-block" }}>{d.description}</Muted>
                          </TopTd>
                          <TopTd>
                            {d.raisedBy?.name || "—"}
                            <br />
                            <Muted>{d.raisedBy?.email || ""}</Muted>
                          </TopTd>
                          <TopTd>
                            {d.againstUser?.name || "—"}
                            <br />
                            <Muted>{d.againstUser?.email || ""}</Muted>
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
                            <Row $gap={2} $wrap>
                              <Button
                                $size="sm"
                                $variant="secondary"
                                onClick={() => setChatExpandedId(chatExpandedId === d._id ? null : d._id)}
                              >
                                {chatExpandedId === d._id ? "Hide chat" : "View chat"}
                              </Button>
                              {!["resolved", "rejected"].includes(d.status) && (
                                <Button $size="sm" onClick={() => setExpandedId(expandedId === d._id ? null : d._id)}>
                                  {expandedId === d._id ? "Close" : "Resolve"}
                                </Button>
                              )}
                            </Row>
                          </TopTd>
                        </Tr>
                        {chatExpandedId === d._id && <ChatPanel dispute={d} onClose={() => setChatExpandedId(null)} />}
                        {expandedId === d._id && (
                          <ResolutionForm
                            dispute={d}
                            submitting={submittingId === d._id}
                            onCancel={() => setExpandedId(null)}
                            onSubmit={handleResolve}
                          />
                        )}
                      </Fragment>
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

export default Disputes;
