import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Star, EyeOff, Trash2, Inbox } from "lucide-react";
import { listFlaggedRatings, moderateRating } from "../../api/ratings";
import { PageContainer, Row, Stack, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/Badge";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Pagination } from "../../components/ui/Pagination";
import {
  Toolbar,
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
import { formatDate } from "../../utils/format";

const TopTd = styled(Td)`
  vertical-align: top;
`;

const ReviewText = styled.div`
  max-width: 300px;
  white-space: pre-wrap;
`;

const PersonName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
`;

const RatingCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

const StarRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 1px;
`;

const StarIcon = styled(Star)`
  flex: none;
  color: ${({ theme, $filled }) => ($filled ? theme.admin.color.warning : theme.admin.color.border)};
`;

const StarValue = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

// Same expressive-icon treatment as the star display used elsewhere in the
// product (see ratingLabel in utils/format), just rendered as real stars
// instead of the plain-text glyph the icon/button-polish pass left behind —
// admin.color.warning (amber) reads as a rating color without introducing
// a new token.
const StarRating = ({ value }) => (
  <RatingCell>
    <StarRow role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={14} strokeWidth={2} $filled={n <= value} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </StarRow>
    <StarValue>{value}/5</StarValue>
  </RatingCell>
);

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const AdminReviews = () => {
  const [stars, setStars] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [ratings, setRatings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const hasFilters = Boolean(stars);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFlaggedRatings({ page, limit: pageSize, stars: stars || undefined });
      setRatings(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, stars]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const handleModerate = async (id, action) => {
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

  const handleRemoveConfirm = async () => {
    if (!confirmTarget) return;
    await handleModerate(confirmTarget._id, "remove");
    setConfirmTarget(null);
  };

  return (
    <PageContainer style={{ maxWidth: 1160 }}>
      <Toolbar>
        <AdminSelect
          value={stars}
          onChange={(e) => {
            setStars(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All star ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={() => setStars("")} />}
        {!loading && <ResultsCount>{total} flagged review{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && ratings.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Inbox size={26} strokeWidth={1.6} />
            <Muted>No flagged reviews right now.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="1040px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Rater</Th>
                    <Th>Ratee</Th>
                    <Th>Rating</Th>
                    <Th>Review</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    ratings.map((r, i) => (
                      <Tr key={r._id}>
                        <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <TopTd>
                          <Row $gap={2}>
                            <Avatar name={r.rater?.name} size={28} />
                            <Stack $gap={0}>
                              <PersonName>{r.rater?.name || "—"}</PersonName>
                              <Muted>{r.rater?.email || "—"}</Muted>
                            </Stack>
                          </Row>
                        </TopTd>
                        <TopTd>
                          <Row $gap={2}>
                            <Avatar name={r.ratee?.name} size={28} />
                            <Stack $gap={0}>
                              <PersonName>{r.ratee?.name || "—"}</PersonName>
                              <Muted>{r.ratee?.email || "—"}</Muted>
                            </Stack>
                          </Row>
                        </TopTd>
                        <TopTd>
                          <StarRating value={r.stars} />
                        </TopTd>
                        <TopTd>
                          <ReviewText>{r.reviewText || <Muted>No text</Muted>}</ReviewText>
                        </TopTd>
                        <TopTd>
                          {r.moderated ? (
                            <StatusBadge status="expired">Hidden</StatusBadge>
                          ) : (
                            <StatusBadge status="pending">Flagged</StatusBadge>
                          )}
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
                              <EyeOff size={14} strokeWidth={2.2} />
                              Hide
                            </Button>
                            <Button
                              $size="sm"
                              $variant="danger"
                              disabled={actioningId === r._id}
                              onClick={() => setConfirmTarget(r)}
                            >
                              <Trash2 size={14} strokeWidth={2.2} />
                              Remove
                            </Button>
                          </Row>
                        </TopTd>
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

      <ConfirmModal
        open={!!confirmTarget}
        title="Remove review"
        description="This review will be permanently deleted. This can't be undone."
        confirmLabel="Remove"
        danger
        submitting={actioningId === confirmTarget?._id}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </PageContainer>
  );
};

export default AdminReviews;
