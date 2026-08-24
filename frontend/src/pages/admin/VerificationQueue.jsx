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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  FileWarning,
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
import { Toolbar, ToolbarSpacer, ResultsCount } from "../../components/ui/AdminToolbar";
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
import { fadeIn, scaleIn, shimmer, wheelSpin } from "../../theme/animations";
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

const LIFECYCLE_LABEL = { candidate: "Candidate", active: "Active", inactive: "Inactive" };

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
    // Reviewing a truck now has real stakes beyond its own KYC — approving
    // a "candidate" makes it the driver's one ACTIVE truck (and retires
    // any prior one) — so the admin sees which of the three it currently
    // is, not just the document status.
    metaOf: (t) =>
      `${t.regNumber} · ${t.truckType || "—"}${t.bodyType ? ` / ${t.bodyType}` : ""} · ${t.totalCapacity ?? "?"}t · ${
        LIFECYCLE_LABEL[t.lifecycle] || t.lifecycle
      }`,
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

// --- Category switcher — doubles as a stat strip so an admin can see queue
// depth per category at a glance, matching Dashboard.jsx's KPI-card idiom
// instead of a plain text tab bar. ---------------------------------------

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space(4)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CategoryCard = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: 16px 18px;
  background: ${({ theme, $active }) => ($active ? theme.admin.color.primarySoft : theme.admin.color.surface)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.admin.color.primary : theme.admin.color.border)};
  border-radius: ${({ theme }) => theme.admin.radius.card};
  box-shadow: ${({ theme, $active }) => ($active ? theme.admin.shadow.raised : theme.admin.shadow.card)};
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.admin.shadow.raised};
    border-color: ${({ theme }) => theme.admin.color.primary};
  }
`;

const CategoryIconWrap = styled.span`
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $active }) => ($active ? theme.admin.color.primary : theme.admin.color.primarySoft)};
  color: ${({ theme, $active }) => ($active ? theme.admin.color.onPrimary : theme.admin.color.primaryDark)};
  transition: background 0.15s ease, color 0.15s ease;
`;

const CategoryBody = styled.div`
  min-width: 0;
`;

const CategoryLabel = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CategoryCount = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 2px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.admin.color.text};
  font-variant-numeric: tabular-nums;
`;

const CategoryCountUnit = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const CountSkeleton = styled.span`
  display: inline-block;
  width: 26px;
  height: 20px;
  border-radius: 5px;
  vertical-align: middle;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.admin.color.bg} 25%,
    ${({ theme }) => theme.admin.color.border} 37%,
    ${({ theme }) => theme.admin.color.bg} 63%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

// --- Status filter + refresh -----------------------------------------------

const StatusToggleGroup = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: ${({ theme }) => theme.admin.color.surface};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const StatusToggleOption = styled.button`
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.admin.color.onPrimary : theme.admin.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.admin.color.primary : "transparent")};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.admin.color.onPrimary : theme.admin.color.text)};
  }
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  color: ${({ theme }) => theme.admin.color.textSecondary};
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.admin.color.primary};
    color: ${({ theme }) => theme.admin.color.text};
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
  color: ${({ theme }) => theme.admin.color.danger};
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
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  background: ${({ theme }) => theme.admin.color.surface};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
  white-space: nowrap;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.admin.color.primary};
    background: ${({ theme }) => theme.admin.color.primarySoft};
    color: ${({ theme }) => theme.admin.color.primaryDark};
  }
`;

// --- Document preview modal (opens inline instead of a new tab) -----------
// Kept on the consumer Card/theme.color chrome, same as ConfirmModal and
// every other admin modal in this console (MakeAdminModal, etc.) — the
// navy/admin palette redesign applies to page-level surfaces (toolbars,
// tables, stat cards), not to modal chrome, so this stays consistent with
// its siblings rather than inventing a one-off look.

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
  max-width: 760px;
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

// Quick-jump strip across an applicant's other documents — lets the admin
// hop straight to (say) the PAN card without stepping through RC/insurance/
// permit one click at a time first.
const PreviewDocTabs = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const PreviewDocTab = styled.button`
  flex: none;
  padding: 5px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme, $active }) => ($active ? theme.color.accentStrong : theme.color.textMuted)};
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accentStrong};
  }
`;

const PreviewBody = styled.div`
  position: relative;
  flex: 1;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.surfaceRaised};
  overflow: auto;
  padding: ${({ theme }) => theme.space(4)};
`;

const PreviewMessage = styled(Muted)`
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const SpinningLoader = styled(Loader2)`
  animation: ${wheelSpin} 0.8s linear infinite;
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

const PreviewNavButton = styled.button`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === "left" ? "left: 14px;" : "right: 14px;")}
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.popover};
  color: ${({ theme }) => theme.color.text};
  transition: background 0.15s ease;
  z-index: 1;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const PreviewFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const DocumentPreviewModal = ({ preview, onClose, onNavigate, onApprove, onReject }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    cardRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNavigate(preview.index - 1);
      else if (e.key === "ArrowRight") onNavigate(preview.index + 1);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [preview, onClose, onNavigate]);

  if (!preview) return null;

  const { item, subject, docs, index } = preview;
  const isImage = preview.mime?.startsWith("image/");
  const isPdf = preview.mime === "application/pdf";
  const hasMultiple = docs.length > 1;
  const isPending = item?.status === "pending";

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
            <Muted>
              {subject?.name || "—"}
              {hasMultiple ? ` · Document ${index + 1} of ${docs.length}` : ""}
            </Muted>
          </Stack>
          <PreviewCloseButton type="button" onClick={onClose} aria-label="Close preview">
            <X size={18} strokeWidth={2.2} />
          </PreviewCloseButton>
        </PreviewHeader>

        {hasMultiple && (
          <PreviewDocTabs>
            {docs.map((d, i) => (
              <PreviewDocTab
                key={i}
                type="button"
                $active={i === index}
                onClick={() => onNavigate(i)}
              >
                {prettyDocType(d.docType)}
              </PreviewDocTab>
            ))}
          </PreviewDocTabs>
        )}

        <PreviewBody>
          {hasMultiple && (
            <PreviewNavButton
              type="button"
              $side="left"
              disabled={index === 0}
              onClick={() => onNavigate(index - 1)}
              aria-label="Previous document"
            >
              <ChevronLeft size={18} strokeWidth={2.2} />
            </PreviewNavButton>
          )}

          {preview.status === "loading" && (
            <PreviewMessage as="div">
              <SpinningLoader size={16} strokeWidth={2.2} />
              Loading document…
            </PreviewMessage>
          )}
          {preview.status === "error" && (
            <PreviewMessage as="div">
              <FileWarning size={16} strokeWidth={2} />
              Could not load this document.
            </PreviewMessage>
          )}
          {preview.status === "ready" && isImage && (
            <PreviewImage src={preview.url} alt={prettyDocType(preview.docType)} />
          )}
          {preview.status === "ready" && isPdf && (
            <PreviewFrame src={preview.url} title={prettyDocType(preview.docType)} />
          )}
          {preview.status === "ready" && !isImage && !isPdf && (
            <Muted>This file type can't be previewed inline — open it in a new tab instead.</Muted>
          )}

          {hasMultiple && (
            <PreviewNavButton
              type="button"
              $side="right"
              disabled={index === docs.length - 1}
              onClick={() => onNavigate(index + 1)}
              aria-label="Next document"
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </PreviewNavButton>
          )}
        </PreviewBody>

        <PreviewFooter>
          <Row $gap={2}>
            {preview.status === "ready" && (
              <Button as="a" href={preview.url} target="_blank" rel="noopener" $variant="ghost" $size="sm">
                <ExternalLink size={14} strokeWidth={2.2} />
                Open in new tab
              </Button>
            )}
          </Row>
          <Row $gap={2}>
            <Button type="button" $variant="secondary" $size="sm" onClick={onClose}>
              Close
            </Button>
            {isPending && (
              <>
                <Button type="button" $variant="danger" $size="sm" onClick={() => onReject(item)}>
                  <XCircle size={14} strokeWidth={2.4} />
                  Reject
                </Button>
                <Button type="button" $size="sm" onClick={() => onApprove(item)}>
                  <CheckCircle2 size={14} strokeWidth={2.4} />
                  Approve
                </Button>
              </>
            )}
          </Row>
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

  // Loads a single document into the preview modal — shared by "open a doc
  // chip", "jump to a doc via the quick-tab strip", and "step prev/next".
  // Keeps the same token-guarded race protection the original single-doc
  // version had, just parameterized by which item/doc-list/index it's for.
  const loadPreviewDoc = async (item, subject, docs, index) => {
    const doc = docs[index];
    const token = ++previewToken.current;
    setPreview({ item, subject, docs, index, docType: doc.docType, status: "loading", url: null, mime: null });
    try {
      const { url, type } = await getFileBlob(doc.url);
      if (previewToken.current !== token) {
        URL.revokeObjectURL(url);
        return;
      }
      setPreview({ item, subject, docs, index, docType: doc.docType, status: "ready", url, mime: type });
    } catch {
      if (previewToken.current !== token) return;
      setPreview({ item, subject, docs, index, docType: doc.docType, status: "error", url: null, mime: null });
    }
  };

  const openPreview = (item, subject, index) => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    loadPreviewDoc(item, subject, item.documents || [], index);
  };

  const navigatePreview = (targetIndex) => {
    if (!preview) return;
    if (targetIndex < 0 || targetIndex >= preview.docs.length || targetIndex === preview.index) return;
    if (preview.url) URL.revokeObjectURL(preview.url);
    loadPreviewDoc(preview.item, preview.subject, preview.docs, targetIndex);
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

  // Lets the preview modal's Approve/Reject buttons drive the exact same
  // handlers the row actions use — no separate logic, just a different
  // entry point so an admin can decide right after looking at the document
  // instead of closing the modal and hunting for the row again.
  const handlePreviewApprove = (item) => {
    closePreview();
    handleApprove(item);
  };

  const handlePreviewReject = (item) => {
    closePreview();
    setConfirmTarget(item);
  };

  return (
    <PageContainer style={{ maxWidth: 1200 }}>
      <CategoryGrid role="tablist" aria-label="Verification category">
        {CATEGORIES.map((c) => {
          const count = pendingCounts[c.key];
          const active = activeCategory === c.key;
          return (
            <CategoryCard
              key={c.key}
              type="button"
              role="tab"
              aria-selected={active}
              $active={active}
              onClick={() => setActiveCategory(c.key)}
            >
              <CategoryIconWrap $active={active}>
                <c.icon size={18} strokeWidth={2.2} />
              </CategoryIconWrap>
              <CategoryBody>
                <CategoryLabel>{c.label}</CategoryLabel>
                <CategoryCount>
                  {count === undefined ? <CountSkeleton /> : count === null ? "—" : count}
                  <CategoryCountUnit>pending</CategoryCountUnit>
                </CategoryCount>
              </CategoryBody>
            </CategoryCard>
          );
        })}
      </CategoryGrid>

      <Toolbar>
        <StatusToggleGroup role="tablist" aria-label="Filter by status">
          {STATUS_TOGGLES.map((s) => (
            <StatusToggleOption
              key={s.key}
              type="button"
              role="tab"
              aria-selected={status === s.key}
              $active={status === s.key}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </StatusToggleOption>
          ))}
        </StatusToggleGroup>
        <ToolbarSpacer />
        {!loading && (
          <ResultsCount>
            {items.length} {status === "all" ? "" : `${status} `}item{items.length === 1 ? "" : "s"}
          </ResultsCount>
        )}
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
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && items.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
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
                  <AdminSkeletonRows rows={5} cols={6} />
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
                                  onClick={() => openPreview(item, subject, di)}
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
      </AdminCard>

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

      <DocumentPreviewModal
        preview={preview}
        onClose={closePreview}
        onNavigate={navigatePreview}
        onApprove={handlePreviewApprove}
        onReject={handlePreviewReject}
      />
    </PageContainer>
  );
};

export default VerificationQueue;
