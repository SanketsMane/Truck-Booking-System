import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listMyTrucks, registerTruck, addTruckDocuments, addTruckPhotos } from "../api/trucks";
import { uploadFile, getFileBlobUrl } from "../api/files";
import { BASE_URL } from "../api/client";
import { PageContainer, SectionTitle, Muted, Stack, Row, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { Field, Input } from "../components/ui/Form";
import { Pagination } from "../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../components/ui/Table";
import { SkeletonTableRows } from "../components/ui/Skeleton";
import {
  Toolbar,
  SearchInput,
  ToolbarSelect,
  ToolbarSpacer,
  ResultsCount,
  ClearFiltersButton,
} from "../components/ui/Toolbar";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const TRUCK_TYPE_PRESETS = ["14ft", "17ft", "20ft", "22ft", "24ft", "32ft SXL", "32ft MXL"];
const BODY_TYPE_PRESETS = ["Open", "Closed Container", "Flatbed", "Tanker", "Refrigerated"];
const DOC_TYPES = [
  { key: "rc", label: "RC (Registration Certificate)", required: true },
  { key: "insurance", label: "Insurance", required: false },
  { key: "permit", label: "Permit", required: false },
];
const emptyDocs = { rc: null, insurance: null, permit: null };

const Header = styled(Row)`
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space(5)};
`;

const HiddenInput = styled.input`
  display: none;
`;

const DocRow = styled(Row)`
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  justify-content: space-between;
`;

const PhotoThumb = styled.img`
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.md};
`;

const DetailRow = styled.tr`
  background: ${({ theme }) => theme.color.surfaceRaised};
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
          {uploading ? "Uploading…" : doc?.fileId ? "Replace file" : "Choose file"}
        </Button>
        {doc?.fileName && (
          <Muted>
            {doc.fileId ? "✓ " : ""}
            {doc.fileName}
          </Muted>
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
      const uploaded = await Promise.all(files.map((file) => uploadFile(file, { isPublic: true })));
      setPhotos((prev) => [
        ...prev,
        ...uploaded.map(({ file }, i) => ({ fileId: file.id, fileName: files[i].name })),
      ]);
    } catch (err) {
      toast.error(err.message);
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
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
        </Row>
        {photos.length > 0 && (
          <Stack $gap={1}>
            {photos.map((p) => (
              <Row key={p.fileId} $gap={2}>
                <Muted>✓ {p.fileName}</Muted>
                <Button type="button" $variant="ghost" $size="sm" onClick={() => handleRemove(p.fileId)}>
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

const RegisterTruckForm = ({ onRegistered }) => {
  const [regNumber, setRegNumber] = useState("");
  const [truckType, setTruckType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [docs, setDocs] = useState(emptyDocs);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [docsUploading, setDocsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!regNumber.trim()) nextErrors.regNumber = "Enter the truck's registration number";
    if (!truckType.trim()) nextErrors.truckType = "Enter or pick a truck type";
    if (!totalCapacity || Number(totalCapacity) <= 0) nextErrors.totalCapacity = "Enter a valid capacity in tons";
    if (!docs.rc?.fileId) nextErrors.rc = "Upload the RC to register this truck";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const { truck } = await registerTruck({
        regNumber: regNumber.trim(),
        truckType: truckType.trim(),
        bodyType: bodyType.trim(),
        totalCapacity: Number(totalCapacity),
        documents: collectDocuments(docs),
        photos: photos.map((p) => ({ fileId: p.fileId })),
      });
      toast.success("Truck registered — pending verification");
      onRegistered(truck);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ marginBottom: 24 }}>
      <SectionTitle style={{ marginBottom: 16 }}>Register a truck</SectionTitle>
      <form onSubmit={handleSubmit}>
        <Field label="Registration number" error={errors.regNumber}>
          <Input
            placeholder="e.g. MH12AB1234"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
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

        <Field label="Total capacity (tons)" error={errors.totalCapacity}>
          <Input
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 9"
            value={totalCapacity}
            onChange={(e) => setTotalCapacity(e.target.value)}
          />
        </Field>

        <DocumentUploadGroup docs={docs} setDocs={setDocs} errors={errors} onUploadingChange={setDocsUploading} />

        <PhotoUploadField photos={photos} setPhotos={setPhotos} />

        <Button type="submit" $fullWidth disabled={submitting || docsUploading} style={{ marginTop: 8 }}>
          {docsUploading ? "Uploading…" : submitting ? "Registering…" : "Register truck"}
        </Button>
      </form>
    </Card>
  );
};

// The full management panel for one truck — photos, documents, add-photos
// form, rejected-truck resubmit form. Rendered inside an expanded table row
// (see MyTrucks below) rather than its own Card, so the table stays the
// primary at-a-glance view and this only takes up space once opened.
const TruckDetailPanel = ({ truck, onUpdated }) => {
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
    <Stack $gap={3} style={{ padding: "12px 4px" }}>
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
              <Muted style={{ textTransform: "capitalize" }}>{doc.docType}</Muted>
              <Button type="button" $variant="ghost" $size="sm" onClick={() => handleView(doc)}>
                View
              </Button>
            </DocRow>
          ))}
        </Stack>
      )}

      <Stack $gap={3}>
        {!showAddPhotos ? (
          <Button type="button" $variant="secondary" $size="sm" onClick={() => setShowAddPhotos(true)}>
            + Add photos
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
    </Stack>
  );
};

export const MyTrucks = () => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    listMyTrucks()
      .then(({ trucks }) => setTrucks(trucks))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRegistered = (truck) => {
    setTrucks((prev) => [truck, ...prev]);
    setShowForm(false);
  };

  const handleTruckUpdated = (updated) => {
    setTrucks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trucks.filter((t) => {
      if (status && t.status !== status) return false;
      if (!q) return true;
      return `${t.regNumber} ${t.truckType} ${t.bodyType || ""}`.toLowerCase().includes(q);
    });
  }, [trucks, search, status]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(search || status);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <Header $gap={3} $wrap>
        <Button type="button" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Register a truck"}
        </Button>
      </Header>

      {showForm && <RegisterTruckForm onRegistered={handleRegistered} />}

      <Toolbar>
        <SearchInput
          placeholder="Search by reg number or type…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <ToolbarSelect
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </ToolbarSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} truck{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <Card $padding="0">
        {!loading && paged.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>
              {trucks.length === 0
                ? "You haven't registered any trucks yet. Register one to start posting trips."
                : "No trucks match these filters."}
            </Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="760px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Reg number</Th>
                    <Th>Type</Th>
                    <Th>Capacity</Th>
                    <Th>Docs</Th>
                    <Th>Photos</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    paged.map((truck, i) => (
                      <Fragment key={truck._id}>
                        <Tr>
                          <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <Td>{truck.regNumber}</Td>
                          <Td>
                            {truck.truckType}
                            {truck.bodyType ? ` · ${truck.bodyType}` : ""}
                          </Td>
                          <Td>{truck.totalCapacity} tons</Td>
                          <Td>{truck.documents?.length || 0}</Td>
                          <Td>{truck.photos?.length || 0}</Td>
                          <Td>
                            <StatusBadge status={truck.status} />
                          </Td>
                          <Td>
                            <Button
                              type="button"
                              $variant="ghost"
                              $size="sm"
                              onClick={() => setExpandedId(expandedId === truck._id ? null : truck._id)}
                            >
                              {expandedId === truck._id ? "Close" : "Manage"}
                            </Button>
                          </Td>
                        </Tr>
                        {expandedId === truck._id && (
                          <DetailRow>
                            <Td colSpan={8}>
                              <TruckDetailPanel truck={truck} onUpdated={handleTruckUpdated} />
                            </Td>
                          </DetailRow>
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
      </Card>
    </PageContainer>
  );
};

export default MyTrucks;
