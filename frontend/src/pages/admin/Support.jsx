import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as supportApi from "../../api/support";
import { PageContainer, PageTitle, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatDateTime } from "../../utils/format";

const TopTd = styled(Td)`
  vertical-align: top;
`;

const MessageText = styled.div`
  max-width: 320px;
  white-space: pre-wrap;
`;

export const Support = () => {
  const [status, setStatus] = useState("open");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const load = async () => {
    try {
      const { requests } = await supportApi.listAllSupportRequests({ status: status || undefined });
      setRequests(requests);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
    <PageContainer style={{ maxWidth: 1080 }}>
      <Row style={{ justifyContent: "space-between" }} $wrap>
        <PageTitle>Support Requests</PageTitle>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="">All</option>
        </Select>
      </Row>

      <Card style={{ marginTop: 20 }}>
        {loading ? (
          <Row style={{ justifyContent: "center", padding: "60px 0" }}>
            <Spinner $size={28} />
          </Row>
        ) : requests.length === 0 ? (
          <EmptyState>
            <Muted>No {status || ""} support requests.</Muted>
          </EmptyState>
        ) : (
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
                {requests.map((r, i) => (
                  <Tr key={r._id}>
                    <IndexTd style={{ verticalAlign: "top" }}>{i + 1}</IndexTd>
                    <TopTd>
                      <strong>{r.subject}</strong>
                    </TopTd>
                    <TopTd>
                      {r.user?.name || "Unknown user"}
                      <br />
                      <Muted>{r.user?.mobile || "—"}</Muted>
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
                      <StatusBadge status={r.status === "resolved" ? "completed" : "pending"}>{r.status}</StatusBadge>
                    </TopTd>
                    <TopTd>
                      {r.status !== "resolved" && (
                        <Button $size="sm" disabled={resolvingId === r._id} onClick={() => handleResolve(r._id)}>
                          {resolvingId === r._id ? "Resolving…" : "Mark resolved"}
                        </Button>
                      )}
                    </TopTd>
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

export default Support;
