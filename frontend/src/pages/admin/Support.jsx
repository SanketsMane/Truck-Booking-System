import { Fragment, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { LifeBuoy, MessageSquare, CheckCircle2 } from "lucide-react";
import * as supportApi from "../../api/support";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
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
import { formatDateTime } from "../../utils/format";

const TopTd = styled(Td)`
  vertical-align: top;
`;

const ResolveRow = styled.tr`
  background: ${({ theme }) => theme.admin.color.bg};
`;

const SubjectText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};

  svg {
    flex: none;
    color: ${({ theme }) => theme.admin.color.textMuted};
  }
`;

const MessagePreview = styled.div`
  max-width: 280px;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const DetailLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.admin.color.textMuted};
  margin-bottom: 3px;
`;

const DetailValue = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
`;

const FullMessage = styled.p`
  margin: 0;
  padding: 12px 14px;
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  white-space: pre-wrap;
  font-size: 13.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.admin.color.text};
`;

// In-context detail/response panel, mirroring Disputes.jsx's expanding-row
// pattern: the full ticket (untruncated message, requester contact info,
// linked booking) opens directly under its row instead of cramming
// everything into the table cell, with the resolve action right there.
// There's no reply-text endpoint on the backend (SupportRequest only has a
// status field — see resolveSupportRequest), so "responding" here means
// reviewing the full request in context and marking it resolved, not a
// fabricated message composer that wouldn't actually send anything.
const TicketPanel = ({ request, onClose, onResolve, resolving }) => (
  <ResolveRow>
    <Td colSpan={7}>
      <Stack $gap={3} style={{ padding: "14px 4px" }}>
        <Row style={{ justifyContent: "space-between" }}>
          <strong style={{ fontSize: 13.5 }}>Ticket details</strong>
          <Button type="button" $variant="ghost" $size="sm" onClick={onClose}>
            Close
          </Button>
        </Row>

        <DetailGrid>
          <div>
            <DetailLabel>Requested by</DetailLabel>
            <DetailValue>{request.user?.name || "Unknown user"}</DetailValue>
            <Muted>{request.user?.email || "—"}</Muted>
            {request.user?.mobile && <Muted>{request.user.mobile}</Muted>}
          </div>
          <div>
            <DetailLabel>Linked booking</DetailLabel>
            {request.booking ? (
              <>
                <DetailValue>{request.booking.goodsDescription || request.booking._id}</DetailValue>
                <Muted>Status: {request.booking.status}</Muted>
              </>
            ) : (
              <Muted>Not linked to a booking</Muted>
            )}
          </div>
          <div>
            <DetailLabel>Raised</DetailLabel>
            <DetailValue>{formatDateTime(request.createdAt)}</DetailValue>
          </div>
        </DetailGrid>

        <div>
          <DetailLabel>Message</DetailLabel>
          <FullMessage>{request.message}</FullMessage>
        </div>

        {request.status !== "resolved" ? (
          <Row $gap={2}>
            <Button $size="sm" disabled={resolving} onClick={() => onResolve(request._id)}>
              <CheckCircle2 size={14} strokeWidth={2.2} />
              {resolving ? "Resolving…" : "Mark resolved"}
            </Button>
          </Row>
        ) : (
          <Muted>This request has been marked resolved.</Muted>
        )}
      </Stack>
    </Td>
  </ResolveRow>
);

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const Support = () => {
  const [status, setStatus] = useState("open");
  const [pageSize, setPageSize] = useState(20);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      const res = await supportApi.listAllSupportRequests({ page, limit: pageSize, status: status || undefined });
      setRequests(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await supportApi.resolveSupportRequest(id);
      toast.success("Marked resolved");
      setExpandedId(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1160 }}>
      <Toolbar>
        <AdminSelect value={status} onChange={handleStatusChange}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="">All</option>
        </AdminSelect>
        <ToolbarSpacer />
        {status !== "open" && <ClearFiltersButton onClick={() => setStatus("open")} />}
        {!loading && <ResultsCount>{total} request{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && requests.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <LifeBuoy size={26} strokeWidth={1.6} />
            <Muted>No {status || ""} support requests.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="960px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Subject</Th>
                    <Th>Raised by</Th>
                    <Th>Booking</Th>
                    <Th>Raised</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                  ) : (
                    requests.map((r, i) => (
                      <Fragment key={r._id}>
                        <Tr>
                          <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <TopTd>
                            <SubjectText>
                              <MessageSquare size={14} strokeWidth={2.2} />
                              {r.subject}
                            </SubjectText>
                            <MessagePreview>{r.message}</MessagePreview>
                          </TopTd>
                          <TopTd>
                            <Row $gap={2}>
                              <Avatar name={r.user?.name} size={28} />
                              <Stack $gap={0}>
                                <div style={{ fontWeight: 600 }}>{r.user?.name || "Unknown user"}</div>
                                <Muted>{r.user?.email || "—"}</Muted>
                              </Stack>
                            </Row>
                          </TopTd>
                          <TopTd>
                            {r.booking ? (
                              <Muted>
                                {r.booking.goodsDescription || r.booking._id} ({r.booking.status})
                              </Muted>
                            ) : (
                              <Muted>—</Muted>
                            )}
                          </TopTd>
                          <TopTd>{formatDateTime(r.createdAt)}</TopTd>
                          <TopTd>
                            <StatusBadge status={r.status === "resolved" ? "completed" : "pending"}>
                              {r.status}
                            </StatusBadge>
                          </TopTd>
                          <TopTd>
                            <Button
                              $size="sm"
                              $variant="secondary"
                              onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                            >
                              {expandedId === r._id ? "Close" : "View"}
                            </Button>
                          </TopTd>
                        </Tr>
                        {expandedId === r._id && (
                          <TicketPanel
                            request={r}
                            onClose={() => setExpandedId(null)}
                            onResolve={handleResolve}
                            resolving={resolvingId === r._id}
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

export default Support;
