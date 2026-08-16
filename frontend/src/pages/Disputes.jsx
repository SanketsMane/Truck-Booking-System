import { Fragment, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listMyDisputes } from "../api/disputes";
import { useAuth } from "../context/AuthContext";
import { PageContainer, Stack, Muted, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
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
import { formatDateTime } from "../utils/format";

const CATEGORY_LABELS = {
  no_show: "No-show",
  damaged_goods: "Damaged goods",
  behavior: "Behavior",
  other: "Other",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Reuses the existing status→color mapping (open/under_review render as
// "pending", resolved as "completed") rather than adding new theme colors
// for a handful of dispute-only statuses — same trick Support.jsx uses.
const badgeStatus = (status) => (status === "resolved" ? "completed" : status === "rejected" ? "rejected" : "pending");

const DetailRow = styled.tr`
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

export const Disputes = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return disputes.filter((d) => {
      if (status && d.status !== status) return false;
      if (category && d.category !== category) return false;
      if (!q) return true;
      return `${d.description} ${d.booking?.goodsDescription || ""}`.toLowerCase().includes(q);
    });
  }, [disputes, status, category, search]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(status || category || search);

  const clearFilters = () => {
    setStatus("");
    setCategory("");
    setSearch("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <Stack $gap={3}>
        <Toolbar>
          <SearchInput
            placeholder="Search description…"
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
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </ToolbarSelect>
          <ToolbarSelect
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </ToolbarSelect>
          <ToolbarSpacer />
          {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
          {!loading && <ResultsCount>{total} dispute{total === 1 ? "" : "s"}</ResultsCount>}
        </Toolbar>

        <Card $padding="0">
          {!loading && paged.length === 0 ? (
            <EmptyState style={{ margin: 20 }}>
              <Muted>
                {disputes.length === 0
                  ? `No disputes involving you yet. If something went wrong on a completed booking, open it and use "Report an issue".`
                  : "No disputes match these filters."}
              </Muted>
            </EmptyState>
          ) : (
            <>
              <TableScroll>
                <Table $minWidth="820px">
                  <thead>
                    <tr>
                      <IndexTh>#</IndexTh>
                      <Th>Category</Th>
                      <Th>Booking</Th>
                      <Th>Raised by</Th>
                      <Th>Against</Th>
                      <Th>Status</Th>
                      <Th>Raised</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows rows={pageSize > 10 ? 10 : pageSize} cols={7} />
                    ) : (
                      paged.map((d, i) => {
                        const raisedByMe = String(d.raisedBy?._id) === String(user?.id);
                        return (
                          <Fragment key={d._id}>
                            <Tr
                              style={{ cursor: "pointer" }}
                              onClick={() => setExpandedId(expandedId === d._id ? null : d._id)}
                            >
                              <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                              <Td>{CATEGORY_LABELS[d.category] || d.category}</Td>
                              <Td>
                                <Muted>{d.booking?.goodsDescription || "—"}</Muted>
                              </Td>
                              <Td>{raisedByMe ? "You" : d.raisedBy?.name || "—"}</Td>
                              <Td>{raisedByMe ? d.againstUser?.name || "—" : "You"}</Td>
                              <Td>
                                <StatusBadge status={badgeStatus(d.status)}>{d.status.replace(/_/g, " ")}</StatusBadge>
                              </Td>
                              <Td>{formatDateTime(d.createdAt)}</Td>
                            </Tr>
                            {expandedId === d._id && (
                              <DetailRow>
                                <Td colSpan={7}>
                                  <Stack $gap={1}>
                                    <Muted style={{ whiteSpace: "pre-wrap" }}>{d.description}</Muted>
                                    {(d.status === "resolved" || d.status === "rejected") &&
                                      d.resolutionNote && <Muted>Resolution: {d.resolutionNote}</Muted>}
                                  </Stack>
                                </Td>
                              </DetailRow>
                            )}
                          </Fragment>
                        );
                      })
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
      </Stack>
    </PageContainer>
  );
};

export default Disputes;
