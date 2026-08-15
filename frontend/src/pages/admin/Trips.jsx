import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { listAdminTrips, deactivateAdminTrip } from "../../api/admin";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDateTime, formatINR } from "../../utils/format";

const NON_DEACTIVATABLE = ["cancelled", "completed"];

export const Trips = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { trips } = await listAdminTrips({ search: search || undefined, status: status || undefined });
      setTrips(trips);
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

  const handleDeactivate = async (reason) => {
    setSubmitting(true);
    try {
      await deactivateAdminTrip(target._id, reason);
      toast.success("Trip deactivated");
      setTarget(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1180 }}>
      <PageTitle>Trips</PageTitle>

      <Card style={{ marginTop: 20 }}>
        <Row $gap={2} $wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by city or transporter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="full">Full</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Row>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "50px 0" }}>
            <Spinner $size={26} />
          </Row>
        ) : trips.length === 0 ? (
          <EmptyState>
            <Muted>No trips match these filters.</Muted>
          </EmptyState>
        ) : (
          <TableScroll>
            <Table $minWidth="900px">
              <thead>
                <tr>
                  <IndexTh>#</IndexTh>
                  <Th>Route</Th>
                  <Th>Transporter</Th>
                  <Th>Truck</Th>
                  <Th>Departure</Th>
                  <Th>Capacity</Th>
                  <Th>Price/t</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {trips.map((t, i) => (
                  <Tr key={t._id}>
                    <IndexTd>{i + 1}</IndexTd>
                    <Td>
                      {t.fromCity} → {t.toCity}
                    </Td>
                    <Td>
                      {t.transporter ? (
                        <Link to={`/admin/users/${t.transporter._id}`}>{t.transporter.name}</Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{t.truck?.regNumber || "—"}</Td>
                    <Td>{formatDateTime(t.departureAt)}</Td>
                    <Td>
                      {t.availableCapacity}/{t.totalCapacity}t
                    </Td>
                    <Td>{formatINR(t.pricePerTon)}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td>
                      <Button
                        $variant="danger"
                        $size="sm"
                        disabled={NON_DEACTIVATABLE.includes(t.status)}
                        onClick={() => setTarget(t)}
                      >
                        Deactivate
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Card>

      <ConfirmModal
        open={!!target}
        title="Deactivate this trip?"
        description={target ? `${target.fromCity} → ${target.toCity} will be cancelled and pulled from search results.` : ""}
        requireReason
        reasonLabel="Reason for deactivation"
        confirmLabel="Deactivate trip"
        danger
        submitting={submitting}
        onConfirm={handleDeactivate}
        onCancel={() => setTarget(null)}
      />
    </PageContainer>
  );
};

export default Trips;
