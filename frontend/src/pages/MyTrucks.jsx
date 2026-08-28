import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  Plus,
  Truck,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronUp,
  Upload,
  Eye,
  X,
  CheckCircle2,
  Weight,
  Trash2,
} from "lucide-react";
import {
  listMyTrucks,
  registerTruck,
  updateTruck,
  addTruckDocuments,
  addTruckPhotos,
  raiseTruckDeleteRequest,
  listMyTruckDeleteRequests,
} from "../api/trucks";
import { uploadFile, getFileBlobUrl } from "../api/files";
import { BASE_URL } from "../api/client";
import { PageContainer, PageTitle, SectionTitle, Muted, Stack, Row, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { Field, Input, Textarea } from "../components/ui/Form";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { SkeletonBlock, SkeletonText } from "../components/ui/Skeleton";
import { useUnitAmount } from "../hooks/useUnitAmount";
import { formatTons } from "../utils/format";
import { normalizeRegNumber, isValidRegNumber } from "../utils/regNumber";
import { fadeIn, scaleIn } from "../theme/animations";

const TRUCK_TYPE_PRESETS = ["14ft", "17ft", "20ft", "22ft", "24ft", "32ft SXL", "32ft MXL"];
const BODY_TYPE_PRESETS = ["Open", "Closed Container", "Flatbed", "Tanker", "Refrigerated"];
const DOC_TYPES = [
  { key: "rc", label: "RC (Registration Certificate)", required: true },
  { key: "insurance", label: "Insurance", required: false },
  { key: "permit", label: "Permit", required: false },
];
const emptyDocs = { rc: null, insurance: null, permit: null };

// Small icon accent alongside each verification status badge — same
// pattern as TripDetail's "Verified" transporter badge.
const STATUS_ICON = { pending: Clock, verified: ShieldCheck, rejected: ShieldAlert };

const docTypeLabel = (docType) => DOC_TYPES.find((d) => d.key === docType)?.label || docType;

const HiddenInput = styled.input`
  display: none;
`;

const CheckIcon = styled(CheckCircle2)`
  color: ${({ theme }) => theme.color.success};
  flex-shrink: 0;
`;

const TruckThumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.sm};
  flex-shrink: 0;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const RegNumber = styled.div`
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.01em;
`;

const TruckMeta = styled(Row)`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13.5px;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  svg {
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const Callout = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.dangerSoft};
  color: ${({ theme }) => theme.color.danger};
  font-size: 13.5px;
  line-height: 1.4;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const PanelWrap = styled(Stack).attrs({ $gap: 4 })`
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const DocRow = styled(Row)`
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  justify-content: space-between;

  &:first-child {
    border-top: none;
  }
`;

const PhotoThumb = styled.img`
  width: 76px;
  height: 76px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

// Uploads the file immediately on selection (the backend needs a fileId to
// reference before the truck/document record can be created), then hands
// the {fileId, fileName} pair up to the parent form's doc state.
const DocumentUploadField = ({ docType, label, required, doc, onUploaded, onUploadingChange, error }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(docType, true);
    try {
      const { file: uploaded } = await uploadFile(file);
      onUploaded(docType, { fileId: uploaded.id, fileName: file.name });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      onUploadingChange?.(docType, false);
    }
  };

  return (
    <Field label={`${label}${required ? "" : " (optional)"}`} error={error}>
      <Row $gap={3} $wrap>
        <Button
          type="button"
          $variant="secondary"
          $size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} strokeWidth={2.2} />
          {uploading ? "Uploading…" : doc?.fileId ? "Replace file" : "Choose file"}
        </Button>
        {doc?.fileName && (
          <Row $gap={1}>
            {doc.fileId && <CheckIcon size={14} strokeWidth={2.2} />}
            <Muted>{doc.fileName}</Muted>
          </Row>
        )}
      </Row>
      <HiddenInput ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleChange} />
    </Field>
  );
};

// Tracks which doc types currently have an upload in flight, so the parent
// form's submit button can disable itself for that window — otherwise
// clicking submit right after picking a file (before the async upload
// resolves and fileId lands in state) fails validation with a confusing
// "upload the RC" error despite a file clearly being selected.
const DocumentUploadGroup = ({ docs, setDocs, errors = {}, onUploadingChange }) => {
  const uploadingRef = useRef(new Set());
  const handleUploaded = (docType, info) => setDocs((prev) => ({ ...prev, [docType]: info }));
  const handleUploadingChange = (docType, isUploading) => {
    if (isUploading) uploadingRef.current.add(docType);
    else uploadingRef.current.delete(docType);
    onUploadingChange?.(uploadingRef.current.size > 0);
  };
  return (
    <Stack $gap={1}>
      {DOC_TYPES.map(({ key, label, required }) => (
        <DocumentUploadField
          key={key}
          docType={key}
          label={label}
          required={required}
          doc={docs[key]}
          onUploaded={handleUploaded}
          onUploadingChange={handleUploadingChange}
          error={errors[key]}
        />
      ))}
    </Stack>
  );
};

const collectDocuments = (docs) =>
  DOC_TYPES.filter(({ key }) => docs[key]?.fileId).map(({ key }) => ({ docType: key, fileId: docs[key].fileId }));

// Truck photos aren't a fixed set of doc types — this accumulates however
// many the transporter picks (uploaded immediately as isPublic, same
// upload-then-reference approach as DocumentUploadField) into a plain list.
const PhotoUploadField = ({ photos, setPhotos }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      // allSettled, not all — each file is an independent upload call, so
      // one failure (size limit, network blip) shouldn't discard photos
      // that already succeeded server-side and force a full re-select.
      const results = await Promise.allSettled(files.map((file) => uploadFile(file, { isPublic: true })));
      const succeeded = [];
      const failed = [];
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          succeeded.push({ fileId: result.value.file.id, fileName: files[i].name });
        } else {
          failed.push(files[i].name);
        }
      });
      if (succeeded.length) setPhotos((prev) => [...prev, ...succeeded]);
      if (failed.length) toast.error(`${failed.join(", ")} failed to upload — try again`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (fileId) => setPhotos((prev) => prev.filter((p) => p.fileId !== fileId));

  return (
    <Field label="Truck photos (optional)" help="Shown to shippers viewing this truck's trips">
      <Stack $gap={2}>
        <Row $gap={3} $wrap>
          <Button type="button" $variant="secondary" $size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImageIcon size={14} strokeWidth={2.2} />
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
        </Row>
        {photos.length > 0 && (
          <Stack $gap={1}>
            {photos.map((p) => (
              <Row key={p.fileId} $gap={2} style={{ justifyContent: "space-between" }}>
                <Row $gap={1}>
                  <CheckIcon size={14} strokeWidth={2.2} />
                  <Muted>{p.fileName}</Muted>
                </Row>
                <Button type="button" $variant="ghost" $size="sm" onClick={() => handleRemove(p.fileId)}>
                  <X size={13} strokeWidth={2.2} />
                  Remove
                </Button>
              </Row>
            ))}
          </Stack>
        )}
      </Stack>
      <HiddenInput ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} />
    </Field>
  );
};

const DraftNotice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: 10px ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surfaceRaised};
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const DraftDismiss = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textMuted};

  &:hover {
    color: ${({ theme }) => theme.color.danger};
  }
`;

// Session-only (not localStorage) — a draft that outlives the tab is more
// surprising than helpful. Same pattern as PostTrip.jsx's draft: guards
// against a validation error (or an "upload the RC" fix that needs another
// page) sending the transporter away and back without losing everything
// already filled in, including already-uploaded document/photo references.
const DRAFT_KEY = "register-truck-draft-v1";

const loadDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // sessionStorage unavailable (private browsing, quota) — draft
    // persistence is a nice-to-have, not required for the form to work.
  }
};

const ConsentRow = styled(Row)`
  align-items: flex-start;
  gap: 8px;
  padding-top: 4px;

  input[type="checkbox"] {
    margin-top: 3px;
    flex-shrink: 0;
  }
`;

const RegisterTruckForm = ({ onRegistered, title = "Register a truck" }) => {
  // Unlike PostTrip's page-level draft (no setter — it clears via a full
  // page reload, since PostTrip *is* the whole page), this form is toggled
  // in and out inside MyTrucks. A reload would also collapse the parent's
  // `showForm` flag and hide the very form being reset, so this keeps a
  // setter and resets fields in place instead (see handleStartOver).
  const [draft, setDraft] = useState(loadDraft);
  const [regNumber, setRegNumber] = useState(draft?.regNumber ?? "");
  const [truckType, setTruckType] = useState(draft?.truckType ?? "");
  const [bodyType, setBodyType] = useState(draft?.bodyType ?? "");
  const totalCapacityAmount = useUnitAmount(draft?.totalCapacityTons ?? "");
  // docs/photos only ever hold {fileId, fileName} references, never raw
  // File objects — DocumentUploadField/PhotoUploadField upload each file
  // immediately on selection and store just the resulting reference (see
  // their handleChange above), so these are plain JSON-safe values and
  // restoring them fully recovers already-uploaded documents/photos too.
  const [docs, setDocs] = useState(draft?.docs ?? emptyDocs);
  const [photos, setPhotos] = useState(draft?.photos ?? []);
  const [authorizedToList, setAuthorizedToList] = useState(draft?.authorizedToList ?? false);
  const [errors, setErrors] = useState({});
  const [docsUploading, setDocsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Saves on every change — protects against the same round trip
  // PostTrip's draft guards against: a validation error whose fix requires
  // visiting another page (or a refresh/crash) shouldn't cost the
  // transporter their already-filled fields or already-uploaded files.
  useEffect(() => {
    const data = {
      regNumber,
      truckType,
      bodyType,
      totalCapacityTons: totalCapacityAmount.tons,
      docs,
      photos,
      authorizedToList,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // sessionStorage unavailable (private browsing, quota) — draft
      // persistence is a nice-to-have, not required for the form to work.
    }
  }, [regNumber, truckType, bodyType, totalCapacityAmount.tons, docs, photos, authorizedToList]);

  const handleStartOver = () => {
    clearDraft();
    setDraft(null);
    setRegNumber("");
    setTruckType("");
    setBodyType("");
    totalCapacityAmount.setTons("");
    setDocs(emptyDocs);
    setPhotos([]);
    setAuthorizedToList(false);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!regNumber.trim()) nextErrors.regNumber = "Enter the truck's registration number";
    else if (!isValidRegNumber(regNumber)) nextErrors.regNumber = "Enter a valid registration number (e.g. DL01AB1234)";
    if (!truckType.trim()) nextErrors.truckType = "Enter or pick a truck type";
    if (!totalCapacityAmount.tons || Number(totalCapacityAmount.tons) <= 0) nextErrors.totalCapacity = "Enter a valid capacity";
    if (!docs.rc?.fileId) nextErrors.rc = "Upload the RC to register this truck";
    if (!authorizedToList) nextErrors.authorizedToList = "Confirm you're authorized to use and list this vehicle";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const { truck } = await registerTruck({
        regNumber: normalizeRegNumber(regNumber),
        truckType: truckType.trim(),
        bodyType: bodyType.trim(),
        totalCapacity: Number(totalCapacityAmount.tons),
        documents: collectDocuments(docs),
        photos: photos.map((p) => ({ fileId: p.fileId })),
        authorizedToList: true,
      });
      toast.success("Truck registered — pending verification");
      clearDraft();
      onRegistered(truck);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <SectionTitle style={{ marginBottom: 16 }}>{title}</SectionTitle>
      {draft && (
        <DraftNotice style={{ marginBottom: 16 }}>
          <span>Restored your in-progress truck registration.</span>
          <DraftDismiss type="button" onClick={handleStartOver}>
            <X size={13} strokeWidth={2.6} />
            Start over
          </DraftDismiss>
        </DraftNotice>
      )}
      <form onSubmit={handleSubmit}>
        <Field label="Registration number" error={errors.regNumber} help="No spaces or hyphens needed — e.g. MH12AB1234">
          <Input
            placeholder="e.g. MH12AB1234"
            value={regNumber}
            onChange={(e) => setRegNumber(normalizeRegNumber(e.target.value))}
          />
        </Field>

        <Field label="Truck type" error={errors.truckType} help="Pick a common size or type your own">
          <Input
            list="truck-type-options"
            placeholder="e.g. 20ft"
            value={truckType}
            onChange={(e) => setTruckType(e.target.value)}
          />
          <datalist id="truck-type-options">
            {TRUCK_TYPE_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field label="Body type (optional)">
          <Input
            list="body-type-options"
            placeholder="e.g. Open"
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value)}
          />
          <datalist id="body-type-options">
            {BODY_TYPE_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field label="Total capacity" error={errors.totalCapacity}>
          <UnitAmountInput
            value={totalCapacityAmount.displayValue}
            unit={totalCapacityAmount.unit}
            onValueChange={totalCapacityAmount.onValueChange}
            onUnitChange={totalCapacityAmount.onUnitChange}
            placeholder="e.g. 9"
          />
        </Field>

        <DocumentUploadGroup docs={docs} setDocs={setDocs} errors={errors} onUploadingChange={setDocsUploading} />

        <PhotoUploadField photos={photos} setPhotos={setPhotos} />

        <ConsentRow>
          <input
            id="authorizedToList"
            type="checkbox"
            checked={authorizedToList}
            onChange={(e) => setAuthorizedToList(e.target.checked)}
          />
          <label htmlFor="authorizedToList">
            <Muted style={{ fontSize: 13.5 }}>
              I confirm that I am authorized to use and list this vehicle on TruckGee — the RC owner doesn't have to
              be me, but I have permission to operate and post trips for it.
            </Muted>
          </label>
        </ConsentRow>
        {errors.authorizedToList && <Callout style={{ marginTop: 4 }}>{errors.authorizedToList}</Callout>}

        <Button type="submit" $fullWidth disabled={submitting || docsUploading} style={{ marginTop: 8 }}>
          {docsUploading ? "Uploading…" : submitting ? "Registering…" : "Register truck"}
        </Button>
      </form>
    </Card>
  );
};

// The full management panel for one truck — photos, documents, add-photos
// form, rejected-truck resubmit form. Rendered inline under the truck's
// card once "Manage" is expanded, rather than its own Card, so the truck
// list stays the primary at-a-glance view and this only takes up space
// once opened.
const TruckDetailPanel = ({ truck, onUpdated }) => {
  const [showRegEdit, setShowRegEdit] = useState(false);
  const [regDraft, setRegDraft] = useState(truck.regNumber);
  const [regError, setRegError] = useState("");
  const [savingReg, setSavingReg] = useState(false);

  const [showResubmit, setShowResubmit] = useState(false);
  const [docs, setDocs] = useState(emptyDocs);
  const [submitting, setSubmitting] = useState(false);
  const [docsUploading, setDocsUploading] = useState(false);

  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [newPhotos, setNewPhotos] = useState([]);
  const [submittingPhotos, setSubmittingPhotos] = useState(false);

  const handleView = async (doc) => {
    try {
      const blobUrl = await getFileBlobUrl(doc.url);
      window.open(blobUrl, "_blank", "noopener");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    const documents = collectDocuments(docs);
    if (!documents.length) {
      toast.error("Choose at least one document to add");
      return;
    }
    setSubmitting(true);
    try {
      const { truck: updated } = await addTruckDocuments(truck._id, documents);
      toast.success("Documents added — sent back for review");
      onUpdated(updated);
      setDocs(emptyDocs);
      setShowResubmit(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // The server is the authority on whether this is allowed: it refuses with
  // a 409 naming the trip while the truck is out on a run (see
  // truckController.updateTruck's in-flight guard). Surfacing that message
  // verbatim beats guessing at the rule here from trip data the page
  // doesn't have — and it can't go stale.
  const handleSaveRegNumber = async (e) => {
    e.preventDefault();
    const next = normalizeRegNumber(regDraft);
    if (!isValidRegNumber(next)) {
      setRegError("Enter a valid registration number (e.g. DL01AB1234)");
      return;
    }
    if (next === truck.regNumber) {
      setShowRegEdit(false);
      return;
    }
    setSavingReg(true);
    setRegError("");
    try {
      const res = await updateTruck(truck._id, { regNumber: next });
      toast.success(res.msg || "Registration number updated");
      onUpdated(res.truck);
      setShowRegEdit(false);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setSavingReg(false);
    }
  };

  const handleAddPhotos = async (e) => {
    e.preventDefault();
    const fileIds = newPhotos.map((p) => p.fileId);
    if (!fileIds.length) {
      toast.error("Choose at least one photo to add");
      return;
    }
    setSubmittingPhotos(true);
    try {
      const { truck: updated } = await addTruckPhotos(truck._id, fileIds);
      toast.success("Photos added");
      onUpdated(updated);
      setNewPhotos([]);
      setShowAddPhotos(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingPhotos(false);
    }
  };

  return (
    <PanelWrap>
      {showRegEdit ? (
        <form onSubmit={handleSaveRegNumber}>
          <Stack $gap={3}>
            <Field
              label="Registration number"
              error={regError}
              help="Changing this sends the truck back for verification — its RC and insurance name the old plate."
            >
              <Input
                value={regDraft}
                onChange={(e) => setRegDraft(e.target.value.toUpperCase())}
                placeholder="e.g. MH12AB1234"
                autoFocus
              />
            </Field>
            <Row $gap={2}>
              <Button type="submit" $size="sm" disabled={savingReg}>
                {savingReg ? "Saving…" : "Save number"}
              </Button>
              <Button
                type="button"
                $variant="ghost"
                $size="sm"
                onClick={() => {
                  setRegDraft(truck.regNumber);
                  setRegError("");
                  setShowRegEdit(false);
                }}
              >
                Cancel
              </Button>
            </Row>
          </Stack>
        </form>
      ) : (
        truck.lifecycle !== "inactive" && (
          <Row $gap={2}>
            <Button type="button" $variant="secondary" $size="sm" onClick={() => setShowRegEdit(true)}>
              Change registration number
            </Button>
          </Row>
        )
      )}

      {truck.photos?.length > 0 && (
        <Row $gap={2} $wrap>
          {truck.photos.map((photo, i) => (
            <PhotoThumb key={i} src={`${BASE_URL}${photo.url}`} alt={`${truck.regNumber} photo ${i + 1}`} loading="lazy" />
          ))}
        </Row>
      )}

      {truck.documents?.length > 0 && (
        <Stack $gap={0}>
          {truck.documents.map((doc, i) => (
            <DocRow key={`${doc.docType}-${i}`} $gap={3}>
              <Row $gap={2}>
                <FileText size={15} strokeWidth={2} />
                <span>{docTypeLabel(doc.docType)}</span>
              </Row>
              <Button type="button" $variant="ghost" $size="sm" onClick={() => handleView(doc)}>
                <Eye size={14} strokeWidth={2.2} />
                View
              </Button>
            </DocRow>
          ))}
        </Stack>
      )}

      <Stack $gap={3}>
        {!showAddPhotos ? (
          <Button type="button" $variant="secondary" $size="sm" onClick={() => setShowAddPhotos(true)}>
            <ImageIcon size={14} strokeWidth={2.2} />
            Add photos
          </Button>
        ) : (
          <form onSubmit={handleAddPhotos}>
            <PhotoUploadField photos={newPhotos} setPhotos={setNewPhotos} />
            <Row $gap={2}>
              <Button type="submit" $size="sm" disabled={submittingPhotos}>
                {submittingPhotos ? "Saving…" : "Save photos"}
              </Button>
              <Button
                type="button"
                $variant="ghost"
                $size="sm"
                onClick={() => {
                  setShowAddPhotos(false);
                  setNewPhotos([]);
                }}
              >
                Cancel
              </Button>
            </Row>
          </form>
        )}
      </Stack>

      {truck.status === "rejected" && (
        <Stack $gap={3}>
          <Field label="Rejection reason">
            <Muted>{truck.rejectReason || "No reason given"}</Muted>
          </Field>
          {!showResubmit ? (
            <Button type="button" $variant="secondary" onClick={() => setShowResubmit(true)}>
              Add documents to resubmit
            </Button>
          ) : (
            <form onSubmit={handleResubmit}>
              <DocumentUploadGroup docs={docs} setDocs={setDocs} onUploadingChange={setDocsUploading} />
              <Row $gap={2}>
                <Button type="submit" disabled={submitting || docsUploading}>
                  {docsUploading ? "Uploading…" : submitting ? "Submitting…" : "Resubmit for review"}
                </Button>
                <Button type="button" $variant="ghost" onClick={() => setShowResubmit(false)}>
                  Cancel
                </Button>
              </Row>
            </form>
          )}
        </Stack>
      )}
    </PanelWrap>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 21, 15, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  animation: ${fadeIn} 0.15s ease;
`;

const ModalCard = styled(Card)`
  width: 100%;
  max-width: 440px;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
`;

// Not built on the shared ConfirmModal (used across the admin side for
// reason-only destructive actions) because this needs a second field — a
// type-the-reg-number confirmation step, so a transporter can't fat-finger
// "Request deletion" on the wrong truck in a long list. Self-contained here
// rather than extending ConfirmModal's API for every other page that uses it.
const DeleteRequestModal = ({ truck, onCancel, onSubmit, submitting }) => {
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");

  const regMatches = normalizeRegNumber(confirmText) === truck.regNumber;
  const reasonTooShort = reason.trim().length < 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!regMatches || reasonTooShort) return;
    onSubmit(reason.trim());
  };

  return (
    <Overlay onClick={submitting ? undefined : onCancel}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <Stack $gap={3}>
            <Stack $gap={1}>
              <SectionTitle>Request truck deletion</SectionTitle>
              <Muted>
                This sends a request to our team to permanently remove <strong>{truck.regNumber}</strong>. It stays
                registered until an admin approves it.
              </Muted>
            </Stack>

            <Field label={`Type "${truck.regNumber}" to confirm`}>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={truck.regNumber}
                autoFocus
              />
            </Field>

            <Field label="Reason for deletion" help="Required — shown to the admin reviewing this request.">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Selling the vehicle" />
            </Field>

            <Row $gap={2} style={{ justifyContent: "flex-end" }}>
              <Button type="button" $variant="ghost" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" $variant="danger" disabled={submitting || !regMatches || reasonTooShort}>
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </Row>
          </Stack>
        </form>
      </ModalCard>
    </Overlay>
  );
};

// One truck's at-a-glance summary — photo/type thumb, reg number, status,
// and document/photo/capacity counts — with the full management panel
// (TruckDetailPanel) tucked behind "Manage" so a fleet list stays scannable.
const TruckCard = ({ truck, expanded, onToggle, onUpdated, deleteRequest, onRequestDelete }) => {
  const StatusIcon = STATUS_ICON[truck.status];
  const docCount = truck.documents?.length || 0;
  const photoCount = truck.photos?.length || 0;

  return (
    <Card>
      <Stack $gap={3}>
        <CardRow>
          <Row $gap={3}>
            <TruckThumb>
              {truck.photos?.[0]?.url ? (
                <img src={`${BASE_URL}${truck.photos[0].url}`} alt="" loading="lazy" />
              ) : (
                <Truck size={20} strokeWidth={2.2} />
              )}
            </TruckThumb>
            <Stack $gap={1}>
              <RegNumber>{truck.regNumber}</RegNumber>
              <Muted>
                {truck.truckType}
                {truck.bodyType ? ` · ${truck.bodyType}` : ""}
              </Muted>
            </Stack>
          </Row>
          <StatusBadge status={truck.status}>
            {StatusIcon && <StatusIcon size={12} strokeWidth={2.4} style={{ marginRight: 4, verticalAlign: -2 }} />}
            {truck.status}
          </StatusBadge>
        </CardRow>

        <TruckMeta $gap={4} $wrap>
          <MetaItem>
            <Weight size={14} strokeWidth={2} />
            {formatTons(truck.totalCapacity)}
          </MetaItem>
          <MetaItem>
            <FileText size={14} strokeWidth={2} />
            {docCount} document{docCount === 1 ? "" : "s"}
          </MetaItem>
          <MetaItem>
            <ImageIcon size={14} strokeWidth={2} />
            {photoCount} photo{photoCount === 1 ? "" : "s"}
          </MetaItem>
        </TruckMeta>

        {truck.status === "rejected" && truck.rejectReason && (
          <Callout>
            <ShieldAlert size={15} strokeWidth={2.2} />
            <span>{truck.rejectReason}</span>
          </Callout>
        )}

        {deleteRequest?.status === "rejected" && (
          <Callout>
            <ShieldAlert size={15} strokeWidth={2.2} />
            <span>
              Your deletion request was rejected
              {deleteRequest.resolutionNote ? ` — ${deleteRequest.resolutionNote}` : ""}. You can request again below.
            </span>
          </Callout>
        )}

        <Row $gap={2} $wrap style={{ justifyContent: "space-between" }}>
          <Row $gap={2} $wrap>
            <Button type="button" $variant="secondary" $size="sm" onClick={onToggle}>
              {expanded ? "Close" : "Manage"}
              {expanded ? <ChevronUp size={15} strokeWidth={2.2} /> : <ChevronDown size={15} strokeWidth={2.2} />}
            </Button>
          </Row>
          {deleteRequest?.status === "pending" ? (
            <StatusBadge status="pending">
              <Clock size={12} strokeWidth={2.4} style={{ marginRight: 4, verticalAlign: -2 }} />
              Deletion requested
            </StatusBadge>
          ) : (
            <Button type="button" $variant="danger" $size="sm" onClick={onRequestDelete}>
              <Trash2 size={14} strokeWidth={2.2} />
              Request deletion
            </Button>
          )}
        </Row>

        {expanded && <TruckDetailPanel truck={truck} onUpdated={onUpdated} />}
      </Stack>
    </Card>
  );
};

// Mirrors TruckCard's shape (thumb + reg number/type, status badge, meta
// row) so the loading state previews the real content instead of a plain
// spinner.
const TruckCardSkeleton = () => (
  <Card>
    <Stack $gap={3}>
      <CardRow>
        <Row $gap={3}>
          <SkeletonBlock $width="48px" $height="48px" $radius="10px" />
          <Stack $gap={1}>
            <SkeletonText $width="130px" $size="16px" />
            <SkeletonBlock $width="90px" $height="12px" />
          </Stack>
        </Row>
        <SkeletonBlock $width="72px" $height="20px" $radius="999px" />
      </CardRow>
      <Row $gap={4}>
        <SkeletonBlock $width="55px" $height="12px" />
        <SkeletonBlock $width="80px" $height="12px" />
        <SkeletonBlock $width="65px" $height="12px" />
      </Row>
    </Stack>
  </Card>
);

// A transporter runs a fleet, not one nominated vehicle. Anything verified
// and not retired can carry a trip (tripController.postTrip), so the page
// splits into two plain groups: the trucks in service — verified ones plus
// any still in review — and retired ones, kept permanently as history so
// past trips stay resolvable.
export const MyTrucks = () => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteRequestsByTruck, setDeleteRequestsByTruck] = useState({});
  const [deleteRequestTarget, setDeleteRequestTarget] = useState(null);
  const [submittingDeleteRequest, setSubmittingDeleteRequest] = useState(false);

  const loadDeleteRequests = () =>
    listMyTruckDeleteRequests().then(({ requests }) => {
      // requests come back newest-first — keep only the latest per truck.
      const byTruck = {};
      for (const r of requests || []) {
        if (!byTruck[r.truck]) byTruck[r.truck] = r;
      }
      setDeleteRequestsByTruck(byTruck);
    });

  useEffect(() => {
    listMyTrucks()
      .then(({ trucks }) => setTrucks(trucks))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    loadDeleteRequests().catch((err) => toast.error(err.message));
  }, []);

  const handleRegistered = (truck) => {
    setTrucks((prev) => [truck, ...prev]);
    setShowForm(false);
  };

  const handleTruckUpdated = (updated) => {
    setTrucks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  };

  const handleSubmitDeleteRequest = async (reason) => {
    setSubmittingDeleteRequest(true);
    try {
      await raiseTruckDeleteRequest(deleteRequestTarget._id, reason);
      toast.success("Deletion request submitted — an admin will review it");
      setDeleteRequestTarget(null);
      await loadDeleteRequests();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingDeleteRequest(false);
    }
  };

  // Verified first so the trucks that can actually take a trip today sit at
  // the top, then the ones still working through review.
  const fleetTrucks = useMemo(
    () =>
      trucks
        .filter((t) => t.lifecycle !== "inactive")
        .sort((a, b) => Number(b.status === "verified") - Number(a.status === "verified")),
    [trucks]
  );
  const historyTrucks = useMemo(() => trucks.filter((t) => t.lifecycle === "inactive"), [trucks]);
  const readyCount = useMemo(() => fleetTrucks.filter((t) => t.status === "verified").length, [fleetTrucks]);

  const renderTruckCard = (truck) => (
    <TruckCard
      key={truck._id}
      truck={truck}
      expanded={expandedId === truck._id}
      onToggle={() => setExpandedId(expandedId === truck._id ? null : truck._id)}
      onUpdated={handleTruckUpdated}
      deleteRequest={deleteRequestsByTruck[truck._id]}
      onRequestDelete={() => setDeleteRequestTarget(truck)}
    />
  );

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <Stack $gap={5}>
        <Stack $gap={1}>
          <PageTitle>My trucks</PageTitle>
          <Muted>
            {readyCount > 0
              ? `${readyCount} truck${readyCount === 1 ? "" : "s"} ready to take trips. Add as many vehicles as you run.`
              : "Register the vehicles you run — each one can take trips once it's verified."}
          </Muted>
        </Stack>

        {loading ? (
          <TruckCardSkeleton />
        ) : (
          <>
            {fleetTrucks.length === 0 && (
              <EmptyState>
                <Truck size={26} strokeWidth={1.6} />
                <Muted>You haven't registered a truck yet. Register one to start posting trips.</Muted>
                {!showForm && (
                  <Button type="button" $size="sm" onClick={() => setShowForm(true)} style={{ marginTop: 4 }}>
                    <Plus size={14} strokeWidth={2.4} />
                    Register a truck
                  </Button>
                )}
              </EmptyState>
            )}

            {fleetTrucks.length > 0 && <Stack $gap={3}>{fleetTrucks.map((truck) => renderTruckCard(truck))}</Stack>}

            {fleetTrucks.length > 0 && !showForm && (
              <Row $gap={2}>
                <Button type="button" $variant="secondary" $size="sm" onClick={() => setShowForm(true)}>
                  <Plus size={14} strokeWidth={2.4} />
                  Add another truck
                </Button>
              </Row>
            )}

            {showForm && <RegisterTruckForm onRegistered={handleRegistered} title="Register a truck" />}
            {fleetTrucks.length > 0 && showForm && (
              <Row $gap={2}>
                <Button type="button" $variant="ghost" $size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </Row>
            )}

            {historyTrucks.length > 0 && (
              <Stack $gap={2}>
                <Button type="button" $variant="ghost" $size="sm" onClick={() => setShowHistory((s) => !s)}>
                  {showHistory ? "Hide" : "Show"} truck history ({historyTrucks.length})
                  {showHistory ? <ChevronUp size={15} strokeWidth={2.2} /> : <ChevronDown size={15} strokeWidth={2.2} />}
                </Button>
                {showHistory && (
                  <Stack $gap={3}>
                    {historyTrucks.map((truck) => renderTruckCard(truck))}
                  </Stack>
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>

      {deleteRequestTarget && (
        <DeleteRequestModal
          truck={deleteRequestTarget}
          onCancel={() => setDeleteRequestTarget(null)}
          onSubmit={handleSubmitDeleteRequest}
          submitting={submittingDeleteRequest}
        />
      )}
    </PageContainer>
  );
};

export default MyTrucks;
