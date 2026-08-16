import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  UserCheck,
  Building2,
  Truck as TruckIcon,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  FileSearch,
} from "lucide-react";
import { listVerificationQueue, reviewVerification } from "../../api/verification";
import { listTruckQueue, reviewTruck } from "../../api/trucks";
import { getFileBlob } from "../../api/files";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { SkeletonTableRows } from "../../components/ui/Skeleton";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/AdminTable";
import { fadeIn, scaleIn } from "../../theme/animations";
import { formatRelative, formatDateTime } from "../../utils/format";

const DOC_LABELS = {
  rc: "RC (Registration Certificate)",
  insurance: "Insurance",
  permit: "Permit",
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  driving_license: "Driving License",
  business_proof: "Business / GST Certificate",
};

const prettyDocType = (value) =>
  DOC_LABELS[value] || (value ? value.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Document");

const CATEGORIES = [
  {
    key: "shipper",
    label: "Shipper KYC",
    icon: UserCheck,
    fetch: (status) => listVerificationQueue({ type: "shipper", status }).then((r) => r.verifications),
    subjectOf: (v) => v.user || {},
  },
  {
    key: "transporter",
    label: "Transporter KYC",
    icon: Building2,
    fetch: (status) => listVerificationQueue({ type: "transporter", status }).then((r) => r.verifications),
    subjectOf: (v) => v.user || {},
  },
  {
    key: "truck",
    label: "Truck Documents",
    icon: TruckIcon,
    fetch: (status) => listTruckQueue({ status }).then((r) => r.trucks),
    subjectOf: (t) => t.owner || {},
    metaOf: (t) => `${t.regNumber} · ${t.truckType || "—"}${t.bodyType ? ` / ${t.bodyType}` : ""} · ${t.totalCapacity ?? "?"}t`,
  },
];

const STATUS_TOGGLES = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const review = (categoryKey, id, body) =>
  categoryKey === "truck" ? reviewTruck(id, body) : reviewVerification(id, body);

// --- Category / status toggles -------------------------------------------

const TabBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  overflow-x: auto;
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 2px;
  margin-right: ${({ theme }) => theme.space(6)};
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.color.text : theme.color.textMuted)};
  border-bottom: 2px solid ${({ theme, $active }) => ($active ? theme.color.accent : "transparent")};
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const TabCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : theme.color.surfaceRaised)};
  color: ${({ theme, $active }) => ($active ? theme.color.accentStrong : theme.color.textMuted)};
`;

const ToggleGroup = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const ToggleOption = styled.button`
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.color.onAccent : theme.color.textMuted)};
  background: ${({ theme, $active }) => ($active ? theme.color.accent : "transparent")};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.color.onAccent : theme.color.text)};
  }
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.4s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
    color: ${({ theme }) => theme.color.text};
  }

  ${({ $spinning }) =>
    $spinning &&
    `svg { animation: spin 0.7s linear infinite; }
     @keyframes spin { to { transform: rotate(360deg); } }`}
`;

// --- Table cells -----------------------------------------------------------

const TopTd = styled(Td)`
  vertical-align: top;
`;

const RejectReason = styled(Muted)`
  color: ${({ theme }) => theme.color.danger};
`;

const DocChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 260px;
`;

const DocChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  white-space: nowrap;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accentStrong};
  }
`;

// --- Document preview modal (opens inline instead of a new tab) -----------

const PreviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 19, 24, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: ${({ theme }) => theme.space(4)};
  animation: ${fadeIn} 0.15s ease;
`;

const PreviewCard = styled(Card)`
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

  &:focus {
    outline: none;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const PreviewCloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const PreviewBody = styled.div`
  flex: 1;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.surfaceRaised};
  overflow: auto;
  padding: ${({ theme }) => theme.space(4)};
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 66vh;
  object-fit: contain;
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: ${({ theme }) => theme.shadow.card};
  background: ${({ theme }) => theme.color.surface};
`;

const PreviewFrame = styled.iframe`
  width: 100%;
  height: 66vh;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface};
`;

const PreviewFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const DocumentPreviewModal = ({ preview, onClose }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    cardRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  const isImage = preview.mime?.startsWith("image/");
  const isPdf = preview.mime === "application/pdf";

  return (
    <PreviewOverlay onClick={onClose}>
      <PreviewCard
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={prettyDocType(preview.docType)}
        onClick={(e) => e.stopPropagation()}
      >
        <PreviewHeader>
          <Stack $gap={0}>
            <strong>{prettyDocType(preview.docType)}</strong>
            {preview.subjectName && <Muted>{preview.subjectName}</Muted>}
          </Stack>
          <PreviewCloseButton type="button" onClick={onClose} aria-label="Close preview">
            <X size={18} strokeWidth={2.2} />
          </PreviewCloseButton>
        </PreviewHeader>

        <PreviewBody>
          {preview.status === "loading" && <Muted>Loading document…</Muted>}
          {preview.status === "error" && <Muted>Could not load this document.</Muted>}
          {preview.status === "ready" && isImage && (
            <PreviewImage src={preview.url} alt={prettyDocType(preview.docType)} />
          )}
          {preview.status === "ready" && isPdf && (
            <PreviewFrame src={preview.url} title={prettyDocType(preview.docType)} />
          )}
          {preview.status === "ready" && !isImage && !isPdf && (
            <Muted>This file type can't be previewed inline — open it in a new tab instead.</Muted>
          )}
        </PreviewBody>

        <PreviewFooter>
          {preview.status === "ready" && (
            <Button as="a" href={preview.url} target="_blank" rel="noopener" $variant="ghost" $size="sm">
              Open in new tab
            </Button>
          )}
          <Button type="button" $variant="secondary" $size="sm" onClick={onClose}>
            Close
          </Button>
        </PreviewFooter>
      </PreviewCard>
    </PreviewOverlay>
  );
};

// --- Page --------------------------------------------------------------

export const VerificationQueue = () => {
  const [activeCategory, setActiveCategory] = useState("shipper");
  const [status, setStatus] = useState("pending");
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({});
  const [actingId, setActingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const previewToken = useRef(0);

  const category = CATEGORIES.find((c) => c.key === activeCategory);

  const loadActive = useCallback(async () => {
    try {
      const items = await category.fetch(status);
      setItemsByCategory((prev) => ({ ...prev, [activeCategory]: items }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, status]);

  const loadPendingCounts = useCallback(async () => {
    const results = await Promise.allSettled(CATEGORIES.map((c) => c.fetch("pending")));
    setPendingCounts(
      Object.fromEntries(
        CATEGORIES.map((c, i) => [c.key, results[i].status === "fulfilled" ? results[i].value.length : null])
      )
    );
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadActive();
    })();
  }, [loadActive]);

  useEffect(() => {
    (async () => {
      await loadPendingCounts();
    })();
  }, [loadPendingCounts]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadActive(), loadPendingCounts()]);
    setRefreshing(false);
  };

  const items = itemsByCategory[activeCategory] || [];

  const openPreview = async (doc, subjectName) => {
    const token = ++previewToken.current;
    setPreview({ docType: doc.docType, subjectName, status: "loading", url: null, mime: null });
    try {
      const { url, type } = await getFileBlob(doc.url);
      if (previewToken.current !== token) {
        URL.revokeObjectURL(url);
        return;
      }
      setPreview({ docType: doc.docType, subjectName, status: "ready", url, mime: type });
    } catch {
      if (previewToken.current !== token) return;
      setPreview({ docType: doc.docType, subjectName, status: "error", url: null, mime: null });
    }
  };

  const closePreview = () => {
    previewToken.current += 1;
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const handleApprove = async (item) => {
    setActingId(item._id);
    try {
      await review(activeCategory, item._id, { status: "verified" });
      toast.success("Approved");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActingId(null);
    }
  };

  const handleRejectConfirm = async (reason) => {
    setSubmitting(true);
    try {
      await review(activeCategory, confirmTarget._id, { status: "rejected", reason });
      toast.success("Rejected");
      setConfirmTarget(null);
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1120 }}>
      <Stack $gap={5}>
        <Stack $gap={1}>
          <Muted>Review KYC submissions and truck documents before they go live on the marketplace.</Muted>
        </Stack>

        <Card $padding="0">
          <div style={{ padding: "0 20px" }}>
            <TabBar role="tablist" aria-label="Verification category">
              {CATEGORIES.map((c) => (
                <TabButton
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === c.key}
                  $active={activeCategory === c.key}
                  onClick={() => setActiveCategory(c.key)}
                >
                  <c.icon size={16} strokeWidth={2.2} />
                  {c.label}
                  {!!pendingCounts[c.key] && (
                    <TabCount $active={activeCategory === c.key}>{pendingCounts[c.key]}</TabCount>
                  )}
                </TabButton>
              ))}
            </TabBar>
          </div>

          <Stack $gap={3} style={{ padding: "18px 20px 20px" }}>
            <Row style={{ justifyContent: "space-between" }} $wrap>
              <ToggleGroup role="tablist" aria-label="Filter by status">
                {STATUS_TOGGLES.map((s) => (
                  <ToggleOption
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={status === s.key}
                    $active={status === s.key}
                    onClick={() => setStatus(s.key)}
                  >
                    {s.label}
                  </ToggleOption>
                ))}
              </ToggleGroup>

              <RefreshButton
                type="button"
                onClick={refreshAll}
                disabled={refreshing}
                $spinning={refreshing}
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw size={16} strokeWidth={2.2} />
              </RefreshButton>
            </Row>

            {!loading && items.length === 0 ? (
              <EmptyState>
                <FileSearch size={26} strokeWidth={1.6} />
                <Muted>
                  No {status === "all" ? "" : `${status} `}items in {category.label}.
                </Muted>
              </EmptyState>
            ) : (
              <TableScroll>
                <Table $minWidth="820px">
                  <thead>
                    <tr>
                      <IndexTh>#</IndexTh>
                      <Th>Applicant</Th>
                      <Th>Documents</Th>
                      <Th>Submitted</Th>
                      <Th>Status</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows rows={5} cols={6} />
                    ) : (
                      items.map((item, i) => {
                        const subject = category.subjectOf(item);
                        const busy = actingId === item._id;
                        return (
                          <Tr key={item._id}>
                            <IndexTd style={{ verticalAlign: "top" }}>{i + 1}</IndexTd>
                            <TopTd>
                              <Row $gap={3}>
                                <Avatar name={subject.name} size={36} />
                                <Stack $gap={0}>
                                  <strong>{subject.name || "—"}</strong>
                                  <Muted>
                                    {[subject.email, subject.mobile, subject.city].filter(Boolean).join(" · ") || "—"}
                                  </Muted>
                                  {category.metaOf && <Muted>{category.metaOf(item)}</Muted>}
                                  {item.businessName && <Muted>Business: {item.businessName}</Muted>}
                                  {item.status === "rejected" && item.rejectReason && (
                                    <RejectReason>Reason: {item.rejectReason}</RejectReason>
                                  )}
                                </Stack>
                              </Row>
                            </TopTd>
                            <TopTd>
                              {item.documents?.length > 0 ? (
                                <DocChips>
                                  {item.documents.map((doc, di) => (
                                    <DocChip
                                      key={di}
                                      type="button"
                                      onClick={() => openPreview(doc, subject.name)}
                                    >
                                      <FileText size={13} strokeWidth={2.2} />
                                      {prettyDocType(doc.docType)}
                                    </DocChip>
                                  ))}
                                </DocChips>
                              ) : (
                                <Muted>None</Muted>
                              )}
                            </TopTd>
                            <TopTd title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</TopTd>
                            <TopTd>
                              <StatusBadge status={item.status} />
                            </TopTd>
                            <TopTd>
                              {item.status === "pending" && (
                                <Row $gap={2}>
                                  <Button $size="sm" disabled={busy} onClick={() => handleApprove(item)}>
                                    <CheckCircle2 size={14} strokeWidth={2.4} />
                                    {busy ? "…" : "Approve"}
                                  </Button>
                                  <Button
                                    $variant="danger"
                                    $size="sm"
                                    disabled={busy}
                                    onClick={() => setConfirmTarget(item)}
                                  >
                                    <XCircle size={14} strokeWidth={2.4} />
                                    Reject
                                  </Button>
                                </Row>
                              )}
                            </TopTd>
                          </Tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </TableScroll>
            )}
          </Stack>
        </Card>
      </Stack>

      <ConfirmModal
        open={!!confirmTarget}
        title="Reject submission"
        description="The applicant will see this reason and can resubmit."
        requireReason
        reasonLabel="Reason for rejection"
        confirmLabel="Reject"
        danger
        submitting={submitting}
        onConfirm={handleRejectConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      <DocumentPreviewModal preview={preview} onClose={closePreview} />
    </PageContainer>
  );
};

export default VerificationQueue;
