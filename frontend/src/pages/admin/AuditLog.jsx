import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { listAuditLogs } from "../../api/admin";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import {
  Toolbar,
  AdminSearchInput,
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
import { fadeIn, scaleIn } from "../../theme/animations";
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// The full vocabulary of action/targetType strings any admin action in the
// app can log (see backend/utils/audit.js call sites) — used to build the
// filter dropdowns and to turn a raw "trip.deactivate" into a readable
// label for the table.
const ACTIONS = [
  { value: "user.setStatus", label: "User status changed" },
  { value: "user.setAdminRole", label: "User admin role changed" },
  { value: "trip.deactivate", label: "Trip deactivated" },
  { value: "booking.forceCancel", label: "Booking force-cancelled" },
  { value: "settings.update", label: "Settings updated" },
  { value: "settings.mobileConfig.update", label: "Mobile app config updated" },
  { value: "settings.branding.update", label: "Branding updated" },
  { value: "chat.view", label: "Chat viewed" },
  { value: "dispute.resolve", label: "Dispute resolved" },
  { value: "file.view", label: "File viewed" },
  { value: "integrations.sms.update", label: "SMS integration updated" },
  { value: "integrations.email.update", label: "Email integration updated" },
  { value: "integrations.kyc.update", label: "KYC integration updated" },
  { value: "rating.moderate", label: "Rating moderated" },
  { value: "truck.review", label: "Truck reviewed" },
  { value: "verification.autoReview", label: "Verification auto-reviewed" },
  { value: "verification.review", label: "Verification reviewed" },
  { value: "post.create", label: "Post created" },
  { value: "post.update", label: "Post updated" },
  { value: "post.publish", label: "Post published" },
  { value: "post.unpublish", label: "Post unpublished" },
  { value: "post.archive", label: "Post archived" },
  { value: "post.delete", label: "Post deleted" },
];

const TARGET_TYPES = [
  "User",
  "Trip",
  "Booking",
  "PlatformSetting",
  "ChatThread",
  "Dispute",
  "UploadedFile",
  "Truck",
  "Verification",
  "Rating",
  "Post",
];

const actionLabel = (value) => ACTIONS.find((a) => a.value === value)?.label || value;

const TargetId = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: ${({ theme }) => theme.space(4)};
  animation: ${fadeIn} 0.15s ease;
`;

const DetailCard = styled(Card)`
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

  &:focus {
    outline: none;
  }
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const DetailBody = styled.div`
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  overflow: auto;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  color: ${({ theme }) => theme.admin.color.textMuted};

  &:hover {
    background: ${({ theme }) => theme.admin.color.bg};
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

const JsonBlock = styled.pre`
  margin: 0;
  padding: 12px 14px;
  background: ${({ theme }) => theme.admin.color.bg};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const DetailModal = ({ entry, onClose }) => {
  useEffect(() => {
    if (!entry) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <Overlay onClick={onClose}>
      <DetailCard $variant="admin" tabIndex={-1} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <Stack $gap={0}>
            <strong>{actionLabel(entry.action)}</strong>
            <Muted>{formatDateTime(entry.createdAt)}</Muted>
          </Stack>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            <X size={17} strokeWidth={2.2} />
          </CloseButton>
        </DetailHeader>
        <DetailBody>
          <Stack $gap={3}>
            <Row $gap={4} $wrap>
              <Stack $gap={0}>
                <Muted>Actor</Muted>
                <span>{entry.actor?.name || "—"} {entry.actor?.email ? `(${entry.actor.email})` : ""}</span>
              </Stack>
              <Stack $gap={0}>
                <Muted>Scope</Muted>
                <span>{entry.scope || "—"}</span>
              </Stack>
              <Stack $gap={0}>
                <Muted>Target</Muted>
                <span>
                  {entry.targetType} · <TargetId>{String(entry.targetId)}</TargetId>
                </span>
              </Stack>
            </Row>
            {entry.reason && (
              <Stack $gap={0}>
                <Muted>Reason</Muted>
                <span>{entry.reason}</span>
              </Stack>
            )}
            {entry.before && (
              <Stack $gap={1}>
                <Muted>Before</Muted>
                <JsonBlock>{JSON.stringify(entry.before, null, 2)}</JsonBlock>
              </Stack>
            )}
            {entry.after && (
              <Stack $gap={1}>
                <Muted>After</Muted>
                <JsonBlock>{JSON.stringify(entry.after, null, 2)}</JsonBlock>
              </Stack>
            )}
          </Stack>
        </DetailBody>
      </DetailCard>
    </Overlay>
  );
};

export const AuditLog = () => {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const hasFilters = Boolean(actor || action || targetType || from || to);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listAuditLogs({
        page,
        limit: pageSize,
        actor: actor || undefined,
        action: action || undefined,
        targetType: targetType || undefined,
        from: from || undefined,
        to: to || undefined,
      })
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
  }, [page, pageSize, actor, action, targetType, from, to]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setActor("");
    setAction("");
    setTargetType("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1200 }}>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by admin name or email…"
          value={actor}
          onChange={handleFilterChange(setActor)}
        />
        <AdminSelect value={action} onChange={handleFilterChange(setAction)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect value={targetType} onChange={handleFilterChange(setTargetType)}>
          <option value="">All target types</option>
          {TARGET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </AdminSelect>
        <AdminDateInput value={from} onChange={handleFilterChange(setFrom)} aria-label="From date" />
        <AdminDateInput value={to} onChange={handleFilterChange(setTo)} aria-label="To date" />
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} entr{total === 1 ? "y" : "ies"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No audit log entries match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="900px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Date/Time</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Target</Th>
                    <Th>Reason</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                  ) : (
                    items.map((entry, i) => (
                      <Tr key={entry._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>{formatDateTime(entry.createdAt)}</Td>
                        <Td>
                          {entry.actor?.name || "—"}
                          {entry.actor?.email && <Muted style={{ fontSize: 12 }}>{entry.actor.email}</Muted>}
                        </Td>
                        <Td>
                          <StatusBadge>{actionLabel(entry.action)}</StatusBadge>
                        </Td>
                        <Td>
                          {entry.targetType} <TargetId>{String(entry.targetId).slice(-8)}</TargetId>
                        </Td>
                        <Td>{entry.reason || "—"}</Td>
                        <Td>
                          <Button type="button" $variant="secondary" $size="sm" onClick={() => setSelected(entry)}>
                            View
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

      <DetailModal entry={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  );
};

export default AuditLog;
