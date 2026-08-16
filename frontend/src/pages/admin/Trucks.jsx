import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ExternalLink, Truck as TruckIcon } from "lucide-react";
import { listAdminTrucks } from "../../api/admin";
import { PageContainer, Muted, EmptyState } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import {
  Toolbar,
  AdminSearchInput,
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
import { formatDateTime, formatTons } from "../../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Same muted-icon cell treatment as admin/Trips.jsx's route/truck cells —
// keeps the reg. number legible as "this is a vehicle" at a glance instead
// of an unlabeled string, and ties the two truck-referencing pages together.
const IconCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  svg {
    color: ${({ theme }) => theme.admin.color.textMuted};
    flex: none;
  }
`;

// FR-11.4 — browse/search every registered truck across the platform.
// Deliberately no review action here (that lives on the verification
// queue) — this is an oversight/lookup view, same role as admin/Trips.jsx
// and admin/Users.jsx.
export const Trucks = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [trucks, setTrucks] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const hasFilters = Boolean(search || status);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listAdminTrucks({ page, limit: pageSize, search: search || undefined, status: status || undefined })
        .then((res) => {
          if (cancelled) return;
          setTrucks(res.items || []);
          setTotal(res.total || 0);
          setPages(res.pages || 1);
        })
        .catch((error) => {
          if (!cancelled) toast.error(error.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, pageSize, search, status]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1200 }}>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by reg. number or truck type…"
          value={search}
          onChange={handleFilterChange(setSearch)}
        />
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} truck{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && trucks.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No trucks match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="820px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Reg. number</Th>
                    <Th>Type</Th>
                    <Th>Capacity</Th>
                    <Th>Owner</Th>
                    <Th>Registered</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    trucks.map((t, i) => (
                      <Tr key={t._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>
                          <IconCell>
                            <TruckIcon size={13} strokeWidth={2.2} />
                            {t.regNumber}
                          </IconCell>
                        </Td>
                        <Td>
                          {t.truckType}
                          {t.bodyType ? ` · ${t.bodyType}` : ""}
                        </Td>
                        <Td>{formatTons(t.totalCapacity)}</Td>
                        <Td>
                          {t.owner ? (
                            <Link to={`/admin/users/${t.owner._id}`}>{t.owner.name || t.owner.email || "—"}</Link>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>{formatDateTime(t.createdAt)}</Td>
                        <Td>
                          <StatusBadge status={t.status} />
                        </Td>
                        <Td>
                          {t.owner && (
                            <Button as={Link} to={`/admin/users/${t.owner._id}`} $variant="secondary" $size="sm">
                              <ExternalLink size={14} strokeWidth={2.4} />
                              View owner
                            </Button>
                          )}
                        </Td>
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

export default Trucks;
