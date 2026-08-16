import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listFlaggedRatings, moderateRating } from "../../api/ratings";
import { PageContainer, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
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
  max-width: 320px;
  white-space: pre-wrap;
`;

const StarsCell = styled.span`
  color: ${({ theme }) => theme.color.accent};
  white-space: nowrap;
`;

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
            <Muted>No flagged reviews right now.</Muted>
          </EmptyState>
        ) : (
          <>
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
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                  ) : (
                    ratings.map((r, i) => (
                      <Tr key={r._id}>
                        <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <TopTd>
                          <div style={{ fontWeight: 600 }}>{r.rater?.name || "—"}</div>
                          <Muted>{r.rater?.email || "—"}</Muted>
                        </TopTd>
                        <TopTd>
                          <div style={{ fontWeight: 600 }}>{r.ratee?.name || "—"}</div>
                          <Muted>{r.ratee?.email || "—"}</Muted>
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
    </PageContainer>
  );
};

export default AdminReviews;
