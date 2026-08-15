import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listAdminUsers } from "../../api/admin";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDate } from "../../utils/format";

const NameLink = styled(Link)`
  font-weight: 600;
  &:hover {
    color: ${({ theme }) => theme.color.accent};
  }
`;

export const Users = () => {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listAdminUsers({
        page,
        limit: 20,
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
  }, [page, search, role, status]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1120 }}>
      <PageTitle>Users</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={handleFilterChange(setSearch)}
            style={{ maxWidth: 260 }}
          />
          <Select value={role} onChange={handleFilterChange(setRole)} style={{ maxWidth: 170 }}>
            <option value="">All roles</option>
            <option value="shipper">Shipper</option>
            <option value="transporter">Transporter</option>
          </Select>
          <Select value={status} onChange={handleFilterChange(setStatus)} style={{ maxWidth: 170 }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </Select>
        </Row>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : users.length === 0 ? (
          <EmptyState>
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
                {users.map((u, i) => (
                  <Tr key={u._id}>
                    <IndexTd>{(page - 1) * 20 + i + 1}</IndexTd>
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
                ))}
              </tbody>
            </Table>
          </TableScroll>
          <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </PageContainer>
  );
};

export default Users;
