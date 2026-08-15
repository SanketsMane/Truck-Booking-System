import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { listAdminTrucks } from "../../api/admin";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDateTime, formatTons } from "../../utils/format";

// FR-11.4 — browse/search every registered truck across the platform.
// Deliberately no review action here (that lives on the verification
// queue) — this is an oversight/lookup view, same role as admin/Trips.jsx
// and admin/Users.jsx.
export const Trucks = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { trucks } = await listAdminTrucks({ search: search || undefined, status: status || undefined });
      setTrucks(trucks);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <PageContainer style={{ maxWidth: 1180 }}>
      <PageTitle>Trucks</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by reg. number or truck type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </Select>
        </Row>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : trucks.length === 0 ? (
          <EmptyState>
            <Muted>No trucks match these filters.</Muted>
          </EmptyState>
        ) : (
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
                {trucks.map((t, i) => (
                  <Tr key={t._id}>
                    <IndexTd>{i + 1}</IndexTd>
                    <Td>{t.regNumber}</Td>
                    <Td>
                      {t.truckType}
                      {t.bodyType ? ` · ${t.bodyType}` : ""}
                    </Td>
                    <Td>{formatTons(t.totalCapacity)}</Td>
                    <Td>{t.owner?.name || t.owner?.mobile || "—"}</Td>
                    <Td>{formatDateTime(t.createdAt)}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td>
                      {t.owner && (
                        <Button as={Link} to={`/admin/users/${t.owner._id}`} $variant="secondary" $size="sm">
                          View owner
                        </Button>
                      )}
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

export default Trucks;
