import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as supportApi from "../../api/support";
import { PageContainer, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
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
import { formatDateTime } from "../../utils/format";

const TopTd = styled(Td)`
  vertical-align: top;
`;

const MessageText = styled.div`
  max-width: 320px;
  white-space: pre-wrap;
`;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const Support = () => {
  const [status, setStatus] = useState("open");
  const [pageSize, setPageSize] = useState(20);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const load = async () => {
    try {
      const res = await supportApi.listAllSupportRequests({ page, limit: pageSize, status: status || undefined });
      setRequests(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await supportApi.resolveSupportRequest(id);
      toast.success("Marked resolved");
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1160 }}>
      <Toolbar>
        <AdminSelect value={status} onChange={handleStatusChange}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="">All</option>
        </AdminSelect>
        <ToolbarSpacer />
        {status !== "open" && <ClearFiltersButton onClick={() => setStatus("open")} />}
        {!loading && <ResultsCount>{total} request{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && requests.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No {status || ""} support requests.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="900px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Subject</Th>
                    <Th>Raised by</Th>
                    <Th>Message</Th>
                    <Th>Booking</Th>
                    <Th>Raised</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    requests.map((r, i) => (
                      <Tr key={r._id}>
                        <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <TopTd>
                          <strong>{r.subject}</strong>
                        </TopTd>
                        <TopTd>
                          {r.user?.name || "Unknown user"}
                          <br />
                          <Muted>{r.user?.email || "—"}</Muted>
                        </TopTd>
                        <TopTd>
                          <MessageText>{r.message}</MessageText>
                        </TopTd>
                        <TopTd>
                          {r.booking ? (
                            <Muted>
                              {r.booking.goodsDescription || r.booking._id} ({r.booking.status})
                            </Muted>
                          ) : (
                            <Muted>—</Muted>
                          )}
                        </TopTd>
                        <TopTd>{formatDateTime(r.createdAt)}</TopTd>
                        <TopTd>
                          <StatusBadge status={r.status === "resolved" ? "completed" : "pending"}>
                            {r.status}
                          </StatusBadge>
                        </TopTd>
                        <TopTd>
                          {r.status !== "resolved" && (
                            <Button $size="sm" disabled={resolvingId === r._id} onClick={() => handleResolve(r._id)}>
                              {resolvingId === r._id ? "Resolving…" : "Mark resolved"}
                            </Button>
                          )}
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

export default Support;
