import { Fragment, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Truck as TruckIcon } from "lucide-react";
import {
  listAdminTruckDeleteRequests,
  resolveAdminTruckDeleteRequest,
  listDeletedTrucks,
} from "../../api/admin";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { Field, Select, Textarea } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
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
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const badgeStatus = (status) => (status === "approved" ? "completed" : status === "rejected" ? "rejected" : "pending");

const TopTd = styled(Td)`
  vertical-align: top;
`;

const ResolveRow = styled.tr`
  background: ${({ theme }) => theme.admin.color.bg};
`;

// Same pill-toggle look as VerificationQueue.jsx's status filter, reused
// here to switch between the live request queue and the read-only
// permanent-deletion archive — two distinct views, one page.
const ViewToggleGroup = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: ${({ theme }) => theme.admin.color.surface};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

const ViewToggleOption = styled.button`
  padding: 7px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.admin.color.onPrimary : theme.admin.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.admin.color.primary : "transparent")};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.admin.color.onPrimary : theme.admin.color.text)};
  }
`;

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

// Approving is irreversible (it permanently deletes the truck), so this
// needs more structure than ConfirmModal's single reason string — an
// inline expanding row, same pattern as admin/Disputes.jsx's ResolutionForm.
const ResolutionForm = ({ request, onCancel, onSubmit, submitting }) => {
  const [outcome, setOutcome] = useState("approved");
  const [resolutionNote, setResolutionNote] = useState("");

  const handleSubmit = () => {
    if (outcome === "rejected" && !resolutionNote.trim()) {
      toast.error("Add a reason for rejecting this request");
      return;
    }
    onSubmit(request._id, { status: outcome, resolutionNote: resolutionNote.trim() || undefined });
  };

  return (
    <ResolveRow>
      <Td colSpan={7}>
        <Stack $gap={3} style={{ padding: "12px 4px" }}>
          <div style={{ maxWidth: 220 }}>
            <Field label="Outcome">
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="approved">Approve — delete truck</option>
                <option value="rejected">Reject</option>
              </Select>
            </Field>
          </div>
          <Field label={outcome === "rejected" ? "Reason for rejection" : "Note (optional)"}>
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder={
                outcome === "rejected"
                  ? "Why this request is being rejected — shown to the transporter"
                  : "Optional note for the record"
              }
            />
          </Field>
          <Row $gap={2}>
            <Button
              $size="sm"
              $variant={outcome === "approved" ? "danger" : "primary"}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : outcome === "approved" ? "Approve & delete truck" : "Submit rejection"}
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

const RequestsView = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const hasFilters = status !== "pending";

  const load = () =>
    listAdminTruckDeleteRequests({ page, limit: pageSize, status: status || undefined }).then((res) => {
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

  const clearFilters = () => {
    setStatus("pending");
    setPage(1);
  };

  const handleResolve = async (id, payload) => {
    setSubmittingId(id);
    try {
      await resolveAdminTruckDeleteRequest(id, payload);
      toast.success(payload.status === "approved" ? "Truck deleted" : "Request rejected");
      setExpandedId(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <>
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
          <option value="rejected">Rejected</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} request{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No deletion requests match this filter.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="960px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Requested</Th>
                    <Th>Truck</Th>
                    <Th>Owner</Th>
                    <Th>Reason</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                  ) : (
                    items.map((r, i) => (
                      <Fragment key={r._id}>
                        <Tr>
                          <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <TopTd>{formatDateTime(r.createdAt)}</TopTd>
                          <TopTd>
                            <IconCell>
                              <TruckIcon size={13} strokeWidth={2.2} />
                              {r.regNumber}
                            </IconCell>
                          </TopTd>
                          <TopTd>
                            {r.requestedBy?.name || "—"}
                            <br />
                            <Muted>{r.requestedBy?.email || ""}</Muted>
                          </TopTd>
                          <TopTd>
                            <Muted style={{ maxWidth: 240, display: "inline-block" }}>{r.reason}</Muted>
                          </TopTd>
                          <TopTd>
                            <StatusBadge status={badgeStatus(r.status)}>{r.status}</StatusBadge>
                          </TopTd>
                          <TopTd>
                            {r.status === "pending" && (
                              <Button $size="sm" onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}>
                                {expandedId === r._id ? "Close" : "Resolve"}
                              </Button>
                            )}
                          </TopTd>
                        </Tr>
                        {expandedId === r._id && (
                          <ResolutionForm
                            request={r}
                            submitting={submittingId === r._id}
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
    </>
  );
};

const ArchiveView = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listDeletedTrucks({ page, limit: pageSize, search: search || undefined })
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
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, pageSize, search]);

  return (
    <>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by reg. number…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <ToolbarSpacer />
        {search && <ClearFiltersButton onClick={() => setSearch("")} />}
        {!loading && <ResultsCount>{total} deleted truck{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No trucks have been deleted yet.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="960px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Reg. number</Th>
                    <Th>Type</Th>
                    <Th>Owner</Th>
                    <Th>Reason</Th>
                    <Th>Deleted by</Th>
                    <Th>Deleted at</Th>
                    <Th>Source</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    items.map((d, i) => (
                      <Tr key={d._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>
                          <IconCell>
                            <TruckIcon size={13} strokeWidth={2.2} />
                            {d.regNumber}
                          </IconCell>
                        </Td>
                        <Td>{d.truckType || "—"}</Td>
                        <Td>
                          {d.owner?.name || "—"}
                          <br />
                          <Muted>{d.owner?.email || ""}</Muted>
                        </Td>
                        <Td>
                          <Muted style={{ maxWidth: 220, display: "inline-block" }}>{d.reason}</Muted>
                        </Td>
                        <Td>{d.deletedBy?.name || "—"}</Td>
                        <Td>{formatDateTime(d.deletedAt)}</Td>
                        <Td>{d.deleteRequest ? "Request" : "Direct"}</Td>
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
    </>
  );
};

export const TruckDeletions = () => {
  const [view, setView] = useState("requests");

  return (
    <PageContainer style={{ maxWidth: 1220 }}>
      <ViewToggleGroup role="tablist" aria-label="Truck deletions view">
        <ViewToggleOption type="button" $active={view === "requests"} onClick={() => setView("requests")}>
          Requests
        </ViewToggleOption>
        <ViewToggleOption type="button" $active={view === "archive"} onClick={() => setView("archive")}>
          Deleted archive
        </ViewToggleOption>
      </ViewToggleGroup>

      {view === "requests" ? <RequestsView /> : <ArchiveView />}
    </PageContainer>
  );
};

export default TruckDeletions;
