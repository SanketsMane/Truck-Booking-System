import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listRatingsForUser, flagRating } from "../api/ratings";
import { Stack, Row, Muted, EmptyState, SectionTitle } from "./ui/Layout";
import { Card, CardRow } from "./ui/Card";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { formatDate } from "../utils/format";

const StarsFilled = styled.span`
  color: ${({ theme }) => theme.color.accent};
  letter-spacing: 1px;
`;

const StarsEmpty = styled.span`
  color: ${({ theme }) => theme.color.border};
  letter-spacing: 1px;
`;

const Stars = ({ value }) => (
  <span aria-label={`${value} out of 5 stars`}>
    <StarsFilled>{"★".repeat(value)}</StarsFilled>
    <StarsEmpty>{"★".repeat(Math.max(0, 5 - value))}</StarsEmpty>
  </span>
);

// Reusable review feed for a given user (transporter or shipper) — FR-08.2.
// Drop it anywhere a user's individual reviews should be browsable, not just
// their numeric average. Each review carries a "Report" button wired to the
// same flagRating endpoint the admin moderation queue (Reviews.jsx) drains.
export const ReviewList = ({ userId, title = "Reviews" }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flaggingId, setFlaggingId] = useState(null);
  const [flaggedIds, setFlaggedIds] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { ratings } = await listRatingsForUser(userId);
      setReviews(ratings || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const handleFlag = async (id) => {
    setFlaggingId(id);
    try {
      await flagRating(id);
      toast.success("Thanks — this review has been reported for moderation");
      setFlaggedIds((prev) => [...prev, id]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFlaggingId(null);
    }
  };

  if (!userId) return null;

  return (
    <Stack $gap={2}>
      <SectionTitle>{title}</SectionTitle>

      {loading ? (
        <Row style={{ justifyContent: "center", padding: "30px 0" }}>
          <Spinner $size={24} />
        </Row>
      ) : reviews.length === 0 ? (
        <EmptyState>
          <Muted>No reviews yet.</Muted>
        </EmptyState>
      ) : (
        <Stack $gap={1}>
          {reviews.map((r) => (
            <Card key={r._id} $padding="12px">
              <Stack $gap={1}>
                <CardRow style={{ alignItems: "flex-start" }}>
                  <Stack $gap={0}>
                    <strong>{r.rater?.name || "Anonymous"}</strong>
                    <Muted>{formatDate(r.createdAt)}</Muted>
                  </Stack>
                  <Stars value={r.stars} />
                </CardRow>
                {r.reviewText && <Muted style={{ whiteSpace: "pre-wrap" }}>{r.reviewText}</Muted>}
                <Row style={{ justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    $variant="ghost"
                    $size="sm"
                    disabled={flaggingId === r._id || flaggedIds.includes(r._id)}
                    onClick={() => handleFlag(r._id)}
                  >
                    {flaggedIds.includes(r._id) ? "Reported" : flaggingId === r._id ? "Reporting…" : "Report"}
                  </Button>
                </Row>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default ReviewList;
