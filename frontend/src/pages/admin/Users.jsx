import { useCallback, useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await listAdminUsers({
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      });
      setUsers(users);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <PageContainer style={{ maxWidth: 1120 }}>
      <PageTitle>Users</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">All roles</option>
            <option value="shipper">Shipper</option>
            <option value="transporter">Transporter</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 170 }}>
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
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <IndexTh>#</IndexTh>
                  <Th>Name</Th>
                  <Th>Mobile</Th>
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
                    <IndexTd>{i + 1}</IndexTd>
                    <Td>
                      <NameLink to={`/admin/users/${u._id}`}>{u.name || "—"}</NameLink>
                      {u.isAdmin && (
                        <StatusBadge status="verified" style={{ marginLeft: 8 }}>
                          admin
                        </StatusBadge>
                      )}
                    </Td>
                    <Td>{u.mobile}</Td>
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
        )}
      </Card>
    </PageContainer>
  );
};

export default Users;
