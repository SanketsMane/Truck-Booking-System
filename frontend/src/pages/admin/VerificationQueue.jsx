import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listVerificationQueue, reviewVerification } from "../../api/verification";
import { listTruckQueue, reviewTruck } from "../../api/trucks";
import { getFileBlobUrl } from "../../api/files";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDateTime } from "../../utils/format";

const STATUS_TABS = ["pending", "verified", "rejected", "all"];

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

const TopTd = styled(Td)`
  vertical-align: top;
`;

const DocList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
`;

const DocListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${({ theme }) => theme.color.accent};
  font-weight: 600;
  font-size: 13px;
`;

const useQueue = ({ kind, type }) => {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      if (kind === "truck") {
        const { trucks } = await listTruckQueue({ status });
        setItems(trucks);
      } else {
        const { verifications } = await listVerificationQueue({ type, status });
        setItems(verifications);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [kind, type, status]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  return { kind, status, setStatus, items, loading, reload: load };
};

const QueueSection = ({ title, queue, subjectOf, metaOf, onApprove, onReject, actingId }) => {
  const handleView = async (doc) => {
    try {
      const url = await getFileBlobUrl(doc.url);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open that document");
    }
  };

  return (
    <Card>
      <Stack $gap={3}>
        <CardRow>
          <SectionTitle>{title}</SectionTitle>
          <Select
            value={queue.status}
            onChange={(e) => queue.setStatus(e.target.value)}
            style={{ maxWidth: 150 }}
          >
            {STATUS_TABS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </CardRow>

        {queue.loading ? (
          <Row style={{ justifyContent: "center", padding: "30px 0" }}>
            <Spinner $size={22} />
          </Row>
        ) : queue.items.length === 0 ? (
          <EmptyState>
            <Muted>No {queue.status === "all" ? "" : queue.status} items.</Muted>
          </EmptyState>
        ) : (
          <TableScroll>
            <Table $minWidth="760px">
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
                {queue.items.map((item, i) => {
                  const subject = subjectOf(item);
                  const busy = actingId === item._id;
                  return (
                    <Tr key={item._id}>
                      <IndexTd style={{ verticalAlign: "top" }}>{i + 1}</IndexTd>
                      <TopTd>
                        <Stack $gap={0}>
                          <strong>{subject.name}</strong>
                          <Muted>
                            {subject.mobile}
                            {subject.city ? ` · ${subject.city}` : ""}
                          </Muted>
                          {metaOf && <Muted>{metaOf(item)}</Muted>}
                          {item.businessName && <Muted>Business: {item.businessName}</Muted>}
                          {item.status === "rejected" && item.rejectReason && (
                            <Muted>Reason: {item.rejectReason}</Muted>
                          )}
                        </Stack>
                      </TopTd>
                      <TopTd>
                        {item.documents?.length > 0 ? (
                          <DocList>
                            {item.documents.map((doc, di) => (
                              <DocListItem key={di}>
                                <span>{prettyDocType(doc.docType)}</span>
                                <LinkButton type="button" onClick={() => handleView(doc)}>
                                  View
                                </LinkButton>
                              </DocListItem>
                            ))}
                          </DocList>
                        ) : (
                          <Muted>None</Muted>
                        )}
                      </TopTd>
                      <TopTd>{formatDateTime(item.createdAt)}</TopTd>
                      <TopTd>
                        <StatusBadge status={item.status} />
                      </TopTd>
                      <TopTd>
                        {item.status === "pending" && (
                          <Row $gap={2}>
                            <Button
                              $size="sm"
                              disabled={busy}
                              onClick={() => onApprove(queue, item)}
                            >
                              {busy ? "…" : "Approve"}
                            </Button>
                            <Button
                              $variant="danger"
                              $size="sm"
                              disabled={busy}
                              onClick={() => onReject(queue, item)}
                            >
                              Reject
                            </Button>
                          </Row>
                        )}
                      </TopTd>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Stack>
    </Card>
  );
};

export const VerificationQueue = () => {
  const shipperQueue = useQueue({ kind: "verification", type: "shipper" });
  const transporterQueue = useQueue({ kind: "verification", type: "transporter" });
  const truckQueue = useQueue({ kind: "truck" });

  const [actingId, setActingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { queue, item }
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async (queue, item) => {
    setActingId(item._id);
    try {
      if (queue.kind === "truck") await reviewTruck(item._id, { status: "verified" });
      else await reviewVerification(item._id, { status: "verified" });
      toast.success("Approved");
      queue.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActingId(null);
    }
  };

  const handleRejectConfirm = async (reason) => {
    const { queue, item } = confirmTarget;
    setSubmitting(true);
    try {
      if (queue.kind === "truck") await reviewTruck(item._id, { status: "rejected", reason });
      else await reviewVerification(item._id, { status: "rejected", reason });
      toast.success("Rejected");
      queue.reload();
      setConfirmTarget(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1120 }}>
      <Stack $gap={5}>
        <PageTitle>Verification Queue</PageTitle>

        <QueueSection
          title="Shipper KYC"
          queue={shipperQueue}
          subjectOf={(v) => v.user || {}}
          onApprove={handleApprove}
          onReject={(queue, item) => setConfirmTarget({ queue, item })}
          actingId={actingId}
        />

        <QueueSection
          title="Transporter KYC"
          queue={transporterQueue}
          subjectOf={(v) => v.user || {}}
          onApprove={handleApprove}
          onReject={(queue, item) => setConfirmTarget({ queue, item })}
          actingId={actingId}
        />

        <QueueSection
          title="Truck documents"
          queue={truckQueue}
          subjectOf={(t) => t.owner || {}}
          metaOf={(t) => `${t.regNumber} · ${t.truckType || "—"}${t.bodyType ? ` / ${t.bodyType}` : ""} · ${t.totalCapacity ?? "?"}t`}
          onApprove={handleApprove}
          onReject={(queue, item) => setConfirmTarget({ queue, item })}
          actingId={actingId}
        />
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
    </PageContainer>
  );
};

export default VerificationQueue;
