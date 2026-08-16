import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listAdminUsers } from "../../api/admin";
import { PageContainer, Row, Muted, EmptyState } from "../../components/ui/Layout";
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
import { formatDate } from "../../utils/format";

const NameLink = styled(Link)`
  font-weight: 600;
  &:hover {
    color: ${({ theme }) => theme.color.accent};
  }
`;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const Users = () => {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const hasFilters = Boolean(search || role || status);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listAdminUsers({
        page,
        limit: pageSize,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      })
        .then((res) => {
          if (cancelled) return;
          setUsers(res.items || []);
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
  }, [page, pageSize, search, role, status]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setRole("");
    setStatus("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1200 }}>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by name or email…"
          value={search}
          onChange={handleFilterChange(setSearch)}
        />
        <AdminSelect value={role} onChange={handleFilterChange(setRole)}>
          <option value="">All roles</option>
          <option value="shipper">Shipper</option>
          <option value="transporter">Transporter</option>
        </AdminSelect>
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} user{total === 1 ? "" : "s"}</ResultsCount>}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && users.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No users match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Roles</Th>
                    <Th>City</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    users.map((u, i) => (
                      <Tr key={u._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>
                          <NameLink to={`/admin/users/${u._id}`}>{u.name || "—"}</NameLink>
                          {u.isAdmin && (
                            <StatusBadge status="verified" style={{ marginLeft: 8 }}>
                              admin
                            </StatusBadge>
                          )}
                        </Td>
                        <Td>{u.email}</Td>
                        <Td>
                          <Row $gap={1} $wrap>
                            {(u.roles || []).map((r) => (
                              <StatusBadge key={r} status="verified">
                                {r}
                              </StatusBadge>
                            ))}
                          </Row>
                        </Td>
                        <Td>{u.city || "—"}</Td>
                        <Td>
                          <StatusBadge status={u.status} />
                        </Td>
                        <Td>{formatDate(u.createdAt)}</Td>
                        <Td>
                          <Button as={Link} to={`/admin/users/${u._id}`} $variant="secondary" $size="sm">
                            View
                          </Button>
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

export default Users;
