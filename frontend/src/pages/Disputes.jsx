import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listMyDisputes } from "../api/disputes";
import { useAuth } from "../context/AuthContext";
import { PageContainer, PageTitle, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { formatDateTime, formatINR } from "../utils/format";

const CATEGORY_LABELS = {
  no_show: "No-show",
  damaged_goods: "Damaged goods",
  payment_issue: "Payment issue",
  behavior: "Behavior",
  other: "Other",
};

// Reuses the existing status→color mapping (open/under_review render as
// "pending", resolved as "completed") rather than adding new theme colors
// for a handful of dispute-only statuses — same trick Support.jsx uses.
const badgeStatus = (status) => (status === "resolved" ? "completed" : status === "rejected" ? "rejected" : "pending");

export const Disputes = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { disputes } = await listMyDisputes();
        setDisputes(disputes || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageContainer>
      <Stack $gap={5}>
        <PageTitle>Disputes</PageTitle>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "60px 0" }}>
            <Spinner $size={28} />
          </Row>
        ) : disputes.length === 0 ? (
          <EmptyState>
            <Muted>
              No disputes involving you yet. If something went wrong on a completed booking, open it and use "Report
              an issue".
            </Muted>
          </EmptyState>
        ) : (
          <Stack $gap={3}>
            {disputes.map((d) => {
              const raisedByMe = String(d.raisedBy?._id) === String(user?.id);
              return (
                <Card key={d._id}>
                  <Stack $gap={2}>
                    <CardRow>
                      <strong>{CATEGORY_LABELS[d.category] || d.category}</strong>
                      <StatusBadge status={badgeStatus(d.status)}>{d.status.replace(/_/g, " ")}</StatusBadge>
                    </CardRow>
                    <Muted>{raisedByMe ? "Raised by you" : `Raised against you by ${d.raisedBy?.name || "the other party"}`}</Muted>
                    <Muted>{d.description}</Muted>
                    {d.booking?.goodsDescription && <Muted>Booking: {d.booking.goodsDescription}</Muted>}
                    {raisedByMe && <Muted>Against: {d.againstUser?.name || "—"}</Muted>}
                    <Muted>Raised {formatDateTime(d.createdAt)}</Muted>
                    {(d.status === "resolved" || d.status === "rejected") && (
                      <Stack $gap={1} style={{ marginTop: 4 }}>
                        {d.resolutionNote && <Muted>Resolution: {d.resolutionNote}</Muted>}
                        {d.resolutionAmount > 0 && <Muted>Amount: {formatINR(d.resolutionAmount)}</Muted>}
                      </Stack>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </PageContainer>
  );
};

export default Disputes;
