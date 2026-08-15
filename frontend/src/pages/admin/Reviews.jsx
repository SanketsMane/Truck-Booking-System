import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listFlaggedRatings, moderateRating } from "../../api/ratings";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDate } from "../../utils/format";

const TopTd = styled(Td)`
  vertical-align: top;
`;

const ReviewText = styled.div`
  max-width: 320px;
  white-space: pre-wrap;
`;

const StarsCell = styled.span`
  color: ${({ theme }) => theme.color.accent};
  white-space: nowrap;
`;

export const AdminReviews = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { ratings } = await listFlaggedRatings();
      setRatings(ratings || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const handleModerate = async (id, action) => {
    if (action === "remove") {
      const confirmed = window.confirm("Remove this review permanently? This can't be undone.");
      if (!confirmed) return;
    }

    setActioningId(id);
    try {
      const res = await moderateRating(id, action);
      toast.success(res.msg || `Review ${action === "hide" ? "hidden" : "removed"}`);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1120 }}>
      <PageTitle>Reviews</PageTitle>
      <Muted style={{ marginTop: 6 }}>Flagged reviews awaiting moderation (FR-08.3).</Muted>

      <Card style={{ marginTop: 20 }}>
        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : ratings.length === 0 ? (
          <EmptyState>
            <Muted>No flagged reviews right now.</Muted>
          </EmptyState>
        ) : (
          <TableScroll>
            <Table $minWidth="920px">
              <thead>
                <tr>
                  <IndexTh>#</IndexTh>
                  <Th>Rater</Th>
                  <Th>Ratee</Th>
                  <Th>Stars</Th>
                  <Th>Review</Th>
                  <Th>Date</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {ratings.map((r, i) => (
                  <Tr key={r._id}>
                    <IndexTd style={{ verticalAlign: "top" }}>{i + 1}</IndexTd>
                    <TopTd>
                      <div style={{ fontWeight: 600 }}>{r.rater?.name || "—"}</div>
                      <Muted>{r.rater?.mobile || "—"}</Muted>
                    </TopTd>
                    <TopTd>
                      <div style={{ fontWeight: 600 }}>{r.ratee?.name || "—"}</div>
                      <Muted>{r.ratee?.mobile || "—"}</Muted>
                    </TopTd>
                    <TopTd>
                      <StarsCell>
                        {"★".repeat(r.stars)}
                        {"☆".repeat(Math.max(0, 5 - r.stars))}
                      </StarsCell>
                    </TopTd>
                    <TopTd>
                      <ReviewText>{r.reviewText || <Muted>No text</Muted>}</ReviewText>
                    </TopTd>
                    <TopTd>{formatDate(r.createdAt)}</TopTd>
                    <TopTd>
                      <Row $gap={2} $wrap>
                        <Button
                          $size="sm"
                          $variant="secondary"
                          disabled={actioningId === r._id}
                          onClick={() => handleModerate(r._id, "hide")}
                        >
                          Hide
                        </Button>
                        <Button
                          $size="sm"
                          $variant="danger"
                          disabled={actioningId === r._id}
                          onClick={() => handleModerate(r._id, "remove")}
                        >
                          Remove
                        </Button>
                      </Row>
                    </TopTd>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </PageContainer>
  );
};

export default AdminReviews;
