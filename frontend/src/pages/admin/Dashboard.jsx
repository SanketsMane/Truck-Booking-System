import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as adminApi from "../../api/admin";
import { PageContainer, PageTitle, SectionTitle, Grid, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { formatINR, formatRelative, formatDate } from "../../utils/format";

const REPORTS = [
  { key: "bookings", label: "Bookings" },
  { key: "revenue-by-route", label: "Revenue by Route" },
  { key: "user-growth", label: "User Growth" },
  { key: "verification-turnaround", label: "Verification Turnaround" },
];

const Tile = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TileValue = styled.div`
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.1;
`;

const TrendWrap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 140px;
  padding-top: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const BarCol = styled.div`
  flex: 1;
  min-width: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;
`;

const Bar = styled.div`
  width: 100%;
  max-width: 22px;
  min-height: 2px;
  height: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.color.accent};
  border-radius: 4px 4px 0 0;
  transition: background 0.15s ease;

  ${BarCol}:hover & {
    background: ${({ theme }) => theme.color.accentStrong};
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  color: ${({ theme }) => theme.color.text};
  font-size: 11.5px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s ease;
  z-index: 5;

  ${BarCol}:hover & {
    opacity: 1;
  }
`;

const AxisLabel = styled.div`
  margin-top: 6px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.textFaint};
  white-space: nowrap;
`;

const RouteRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr 32px;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
`;

const RouteTrack = styled.div`
  height: 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surfaceRaised};
  overflow: hidden;
`;

const RouteFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.color.accent};
  border-radius: ${({ theme }) => theme.radius.pill};
`;

const BookingsTrend = ({ data }) => {
  if (!data?.length) return <Muted>No booking activity yet.</Muted>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  return (
    <TrendWrap role="img" aria-label="Bookings created per day over the recent period">
      {data.map((d, i) => (
        <BarCol key={d._id}>
          <Tooltip>
            {formatDate(d._id)} · {d.count} booking{d.count === 1 ? "" : "s"}
          </Tooltip>
          <Bar $pct={(d.count / max) * 100} />
          {i % labelEvery === 0 && <AxisLabel>{formatDate(d._id).replace(/,.*/, "")}</AxisLabel>}
        </BarCol>
      ))}
    </TrendWrap>
  );
};

const TopRoutes = ({ routes }) => {
  if (!routes?.length) return <Muted>No route data yet.</Muted>;
  const max = Math.max(...routes.map((r) => r.count), 1);
  return (
    <Stack $gap={2}>
      {routes.map((r, i) => (
        <RouteRow key={i}>
          <span>
            {r.fromCity} → {r.toCity}
          </span>
          <RouteTrack>
            <RouteFill $pct={(r.count / max) * 100} />
          </RouteTrack>
          <span style={{ textAlign: "right" }}>{r.count}</span>
        </RouteRow>
      ))}
    </Stack>
  );
};

export const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { dashboard } = await adminApi.getAdminDashboard();
        setDashboard(dashboard);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = async (key) => {
    setDownloading(key);
    try {
      await adminApi.downloadAdminReport(key);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Row style={{ justifyContent: "center", padding: "80px 0" }}>
          <Spinner $size={28} />
        </Row>
      </PageContainer>
    );
  }

  if (!dashboard) {
    return (
      <PageContainer>
        <PageTitle>Dashboard</PageTitle>
        <EmptyState>
          <Muted>Couldn't load dashboard data.</Muted>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer style={{ maxWidth: 1120 }}>
      <Stack $gap={5}>
        <PageTitle>Admin Dashboard</PageTitle>

        <Grid $cols={2} $colsTablet={4} $gap={3}>
          <Tile>
            <Muted>Total trips</Muted>
            <TileValue>{dashboard.totalTrips}</TileValue>
          </Tile>
          <Tile>
            <Muted>Total bookings</Muted>
            <TileValue>{dashboard.totalBookings}</TileValue>
          </Tile>
          <Tile>
            <Muted>Active trucks</Muted>
            <TileValue>{dashboard.activeTrucks}</TileValue>
          </Tile>
          <Tile>
            <Muted>Revenue indicator</Muted>
            <TileValue>{formatINR(dashboard.revenueIndicator)}</TileValue>
          </Tile>
        </Grid>

        <Grid $cols={1} $colsTablet={2} $gap={4}>
          <Card>
            <Stack $gap={3}>
              <SectionTitle>Bookings — recent trend</SectionTitle>
              <BookingsTrend data={dashboard.bookingsTrend} />
            </Stack>
          </Card>
          <Card>
            <Stack $gap={3}>
              <SectionTitle>Top routes</SectionTitle>
              <TopRoutes routes={dashboard.topRoutes} />
            </Stack>
          </Card>
        </Grid>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Reports</SectionTitle>
            <Muted>Download CSV exports for offline analysis.</Muted>
            <Row $gap={2} $wrap>
              {REPORTS.map((r) => (
                <Button
                  key={r.key}
                  $variant="secondary"
                  $size="sm"
                  disabled={downloading === r.key}
                  onClick={() => handleDownload(r.key)}
                >
                  {downloading === r.key ? "Downloading…" : `⬇ ${r.label}`}
                </Button>
              ))}
            </Row>
          </Stack>
        </Card>

        <Grid $cols={1} $colsTablet={2} $gap={4}>
          <Card>
            <Stack $gap={3}>
              <SectionTitle>Recent bookings</SectionTitle>
              {dashboard.recentBookings?.length ? (
                <Stack $gap={2}>
                  {dashboard.recentBookings.map((b) => (
                    <CardRow key={b._id}>
                      <Stack $gap={0}>
                        <span>{b.shipper?.name || "Shipper"}</span>
                        <Muted>{b.goodsDescription || "—"}</Muted>
                      </Stack>
                      <Stack $gap={0} style={{ alignItems: "flex-end" }}>
                        <StatusBadge status={b.status} />
                        <Muted>{formatRelative(b.createdAt)}</Muted>
                      </Stack>
                    </CardRow>
                  ))}
                </Stack>
              ) : (
                <Muted>No bookings yet.</Muted>
              )}
            </Stack>
          </Card>
          <Card>
            <Stack $gap={3}>
              <SectionTitle>Recent registrations</SectionTitle>
              {dashboard.recentRegistrations?.length ? (
                <Stack $gap={2}>
                  {dashboard.recentRegistrations.map((u) => (
                    <CardRow key={u._id}>
                      <Stack $gap={0}>
                        <span>{u.name}</span>
                        <Muted>{u.mobile}</Muted>
                      </Stack>
                      <Stack $gap={0} style={{ alignItems: "flex-end" }}>
                        <Row $gap={1}>
                          {(u.roles || []).map((r) => (
                            <StatusBadge key={r} status="verified">
                              {r}
                            </StatusBadge>
                          ))}
                        </Row>
                        <Muted>{formatRelative(u.createdAt)}</Muted>
                      </Stack>
                    </CardRow>
                  ))}
                </Stack>
              ) : (
                <Muted>No registrations yet.</Muted>
              )}
            </Stack>
          </Card>
        </Grid>
      </Stack>
    </PageContainer>
  );
};

export default Dashboard;
