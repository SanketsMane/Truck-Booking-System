import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { toast } from "react-toastify";
import {
  Route as RouteIcon,
  Package,
  Truck as TruckIcon,
  PackageCheck,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Users as UsersIcon,
  Inbox,
} from "lucide-react";
import * as adminApi from "../../api/admin";
import { Row } from "../../components/ui/Layout";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonBlock } from "../../components/ui/Skeleton";
import { formatRelative, formatDate } from "../../utils/format";

const REPORTS = [
  {
    key: "bookings",
    label: "Bookings report",
    description: "Export booking history and status data",
  },
  {
    key: "bookings-by-route",
    label: "Bookings by route",
    description: "Booking volume across every lane",
  },
  {
    key: "user-growth",
    label: "User growth",
    description: "New shipper and transporter signups over time",
  },
  {
    key: "verification-turnaround",
    label: "Verification turnaround",
    description: "Time-to-decision on KYC and truck reviews",
  },
];

const Page = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px 16px 56px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 28px 32px 64px;
  }
`;

const Section = styled.div`
  margin-top: 28px;

  &:first-child {
    margin-top: 0;
  }
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};
`;

const SectionSubtitle = styled.p`
  margin: 2px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const AdminCard = styled.div`
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.card};
  box-shadow: ${({ theme }) => theme.admin.shadow.card};
  padding: ${({ $padding }) => $padding || "18px"};
`;

// Same shimmer as components/ui/Skeleton.jsx's SkeletonBlock, retinted to
// the admin palette (that one reads theme.color.*, which the light/navy
// admin surface doesn't use) — same pattern AdminTable.jsx's
// AdminSkeletonBase already established for table-row loading.
const DashSkeletonBlock = styled(SkeletonBlock)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.admin.color.bg} 25%,
    ${({ theme }) => theme.admin.color.border} 37%,
    ${({ theme }) => theme.admin.color.bg} 63%
  );
  background-size: 400% 100%;
`;

const KpiSkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const SkeletonRowLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.admin.color.border};
  }
`;

const KpiCardSkeleton = () => (
  <AdminCard>
    <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
      <DashSkeletonBlock $width="70px" $height="11px" />
      <DashSkeletonBlock $width="32px" $height="32px" $radius="8px" />
    </Row>
    <DashSkeletonBlock $width="50%" $height="30px" />
  </AdminCard>
);

const ChartSkeleton = () => (
  <div>
    <Row style={{ justifyContent: "space-between", marginBottom: 14 }}>
      <DashSkeletonBlock $width="140px" $height="15px" />
      <DashSkeletonBlock $width="120px" $height="26px" $radius="8px" />
    </Row>
    <DashSkeletonBlock $height="168px" $radius="8px" />
  </div>
);

const ListSkeleton = ({ rows = 5 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRowLine key={i}>
        <DashSkeletonBlock $width="32px" $height="32px" $radius="50%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <DashSkeletonBlock $width="45%" $height="13px" />
          <DashSkeletonBlock $width="30%" $height="11px" />
        </div>
        <DashSkeletonBlock $width="60px" $height="18px" $radius="999px" />
      </SkeletonRowLine>
    ))}
  </div>
);

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const KpiCard = styled(AdminCard)`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const KpiTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

const KpiLabel = styled.div`
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const KpiIconWrap = styled.span`
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.admin.color.primarySoft};
  color: ${({ theme }) => theme.admin.color.primaryDark};
`;

const KpiValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.admin.color.text};
  line-height: 1.1;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 32px;
  }
`;

const KpiTrend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $direction }) =>
    $direction === "down" ? theme.admin.color.danger : theme.admin.color.success};
`;

const KpiTrendMuted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

// Shown instead of KpiTrend on the three KPIs the API doesn't return a
// historical comparison for — a plain number with nothing underneath it
// reads as unfinished, but the fix is honest context, not a fabricated
// percentage.
const KpiHelper = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const PageHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 14px;
`;

const LastUpdated = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
  transition: background 0.15s ease, border-color 0.15s ease;

  svg {
    transition: transform 0.4s ease;
    ${({ $spinning }) => $spinning && css`animation: spin 0.8s linear infinite;`}
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.admin.color.bg};
    border-color: ${({ theme }) => theme.admin.color.textMuted};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ViewAllLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.primaryDark};

  &:hover {
    text-decoration: underline;
  }
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: 1.3fr 1fr;
  }
`;

const RangeTabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  background: ${({ theme }) => theme.admin.color.bg};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const RangeTab = styled.button`
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.admin.color.primaryDark : theme.admin.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.admin.color.surface : "transparent")};
  box-shadow: ${({ $active }) => ($active ? "0 1px 2px rgba(15,23,42,0.08)" : "none")};
`;

const ChartWrap = styled.div`
  position: relative;
`;

const GridLines = styled.div`
  position: absolute;
  inset: 0;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
`;

const GridLine = styled.div`
  border-top: 1px dashed ${({ theme }) => theme.admin.color.border};
`;

const TrendWrap = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 168px;
  padding-top: 8px;
`;

const BarCol = styled.div`
  flex: 1;
  min-width: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;
`;

const Bar = styled.div`
  width: 100%;
  max-width: 18px;
  min-height: 3px;
  height: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.admin.color.primary};
  border-radius: 3px 3px 0 0;
  transition: background 0.15s ease, opacity 0.15s ease;

  ${BarCol}:hover & {
    background: ${({ theme }) => theme.admin.color.primaryDark};
  }
`;

const BarTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 5px 9px;
  border-radius: 6px;
  background: ${({ theme }) => theme.admin.color.navy};
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
  z-index: 5;

  ${BarCol}:hover & {
    opacity: 1;
  }
`;

const AxisRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const AxisLabel = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const RouteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const RouteRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const RouteHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
`;

const RouteName = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
  min-width: 0;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex: none;
    color: ${({ theme }) => theme.admin.color.textMuted};
  }
`;

const RouteCount = styled.span`
  flex: none;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const RouteTrack = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.admin.color.bg};
  overflow: hidden;
`;

const RouteFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.admin.color.primary};
  border-radius: 999px;
`;

const ReportGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ReportCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.card};
`;

const ReportIcon = styled.span`
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.admin.color.bg};
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const ReportBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ReportName = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};
`;

const ReportDescription = styled.p`
  margin: 2px 0 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  line-height: 1.4;
`;

const ReportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.admin.color.bg};
    border-color: ${({ theme }) => theme.admin.color.textMuted};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ActivityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.admin.color.border};
  }
`;

const ActivityBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityTitle = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActivityMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActivityRight = styled.div`
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
`;

const ActivityTime = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const BookingRoute = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    flex: none;
    color: ${({ theme }) => theme.admin.color.textMuted};
  }
`;

const EmptyBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 16px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  text-align: center;

  svg {
    color: ${({ theme }) => theme.admin.color.textMuted};
    margin-bottom: 4px;
  }
`;

const EmptyTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};
`;

const EmptyDescription = styled.p`
  margin: 0;
  max-width: 320px;
  font-size: 12.5px;
  line-height: 1.5;
`;

const ErrorBlock = styled(EmptyBlock)`
  svg {
    color: ${({ theme }) => theme.admin.color.danger};
  }
`;

const RetryButton = styled.button`
  margin-top: 4px;
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};

  &:hover {
    background: ${({ theme }) => theme.admin.color.bg};
  }
`;

// `children` is the simple one-line form (still used where a title alone
// says everything); pass `title` + `description` for the fuller two-line
// empty state the busier sections (chart, lists) use.
const AdminEmptyState = ({ icon: Icon = Inbox, title, description, children, action }) => (
  <EmptyBlock>
    <Icon size={22} strokeWidth={1.8} />
    <EmptyTitle>{title || children}</EmptyTitle>
    {description && <EmptyDescription>{description}</EmptyDescription>}
    {action}
  </EmptyBlock>
);

const AdminErrorState = ({ title = "Unable to load data", description = "Something went wrong while loading this data.", onRetry }) => (
  <ErrorBlock>
    <AlertCircle size={22} strokeWidth={1.8} />
    <EmptyTitle>{title}</EmptyTitle>
    <EmptyDescription>{description}</EmptyDescription>
    {onRetry && (
      <RetryButton type="button" onClick={onRetry}>
        Try again
      </RetryButton>
    )}
  </ErrorBlock>
);

// Trims the 30-day trend the backend returns down to the last 7 entries
// for the "7 days" tab — no new endpoint/param, just a client-side slice
// of data already being fetched. A "90 days" tab isn't offered: the API
// only ever returns 30 days of daily buckets, and showing a tab labeled
// "90 days" that's silently the same 30 days would be misleading.
const RANGE_OPTIONS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
];

const BookingsTrendChart = ({ data }) => {
  if (!data?.length) {
    return (
      <AdminEmptyState
        icon={Package}
        title="No booking activity yet"
        description="Bookings will appear here once shippers start creating them."
      />
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <ChartWrap role="img" aria-label="Bookings created per day over the selected period">
      <GridLines>
        <GridLine />
        <GridLine />
        <GridLine />
        <GridLine />
      </GridLines>
      <TrendWrap>
        {data.map((d) => (
          <BarCol key={d._id}>
            <BarTooltip>
              {formatDate(d._id)} · {d.count} booking{d.count === 1 ? "" : "s"}
            </BarTooltip>
            <Bar $pct={Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)} />
          </BarCol>
        ))}
      </TrendWrap>
      <AxisRow>
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <AxisLabel key={d._id}>{formatDate(d._id).replace(/,.*/, "")}</AxisLabel>
          ) : null
        )}
      </AxisRow>
    </ChartWrap>
  );
};

const TopRoutesList = ({ routes }) => {
  if (!routes?.length) {
    return (
      <AdminEmptyState
        icon={RouteIcon}
        title="No route data yet"
        description="Popular routes will appear here as bookings are created."
      />
    );
  }
  const max = Math.max(...routes.map((r) => r.count), 1);
  return (
    <RouteList>
      {routes.map((r, i) => (
        <RouteRow key={i}>
          <RouteHead>
            <RouteName>
              <span>
                {r.fromCity} <ArrowUpRight size={12} style={{ transform: "rotate(45deg)" }} /> {r.toCity}
              </span>
            </RouteName>
            <RouteCount>{r.count}</RouteCount>
          </RouteHead>
          <RouteTrack>
            <RouteFill $pct={(r.count / max) * 100} />
          </RouteTrack>
        </RouteRow>
      ))}
    </RouteList>
  );
};

export const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  // "loading" (first paint, nothing to show yet), "error" (fetch failed,
  // no stale data to fall back on), "loaded" (dashboard is set) — kept
  // distinct from `refreshing` below, since a manual refresh has real data
  // already on screen and shouldn't blank the page back to skeletons.
  const [status, setStatus] = useState("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [range, setRange] = useState("30d");

  const fetchDashboard = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { dashboard } = await adminApi.getAdminDashboard();
      setDashboard(dashboard);
      setStatus("loaded");
      setLastUpdated(new Date());
    } catch (error) {
      if (isRefresh) toast.error(error.message);
      else setStatus("error");
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount, not deriving from props/state — an external
    // system (the API), same as every other page's mount-time fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

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

  // Real, derived-from-data trend: this week's bookings vs. the 7 days
  // before it, both read straight off the same `bookingsTrend` array the
  // chart renders. No trend is shown for the other three KPIs — the API
  // doesn't return historical comparisons for trips/trucks/completed
  // bookings, and making one up would be exactly the kind of hardcoded
  // number this dashboard shouldn't show.
  const bookingsWoWTrend = useMemo(() => {
    const trend = dashboard?.bookingsTrend;
    if (!trend || trend.length < 14) return null;
    const last7 = trend.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const prev7 = trend.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
    if (prev7 === 0) return null;
    const pct = ((last7 - prev7) / prev7) * 100;
    return { pct, direction: pct >= 0 ? "up" : "down" };
  }, [dashboard]);

  const chartData = useMemo(() => {
    if (!dashboard?.bookingsTrend) return [];
    const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
    return dashboard.bookingsTrend.slice(-days);
  }, [dashboard, range]);

  if (status === "loading") {
    return (
      <Page>
        <Section>
          <KpiSkeletonGrid>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </KpiSkeletonGrid>
        </Section>
        <Section>
          <TwoCol>
            <AdminCard>
              <ChartSkeleton />
            </AdminCard>
            <AdminCard>
              <ListSkeleton rows={4} />
            </AdminCard>
          </TwoCol>
        </Section>
        <Section>
          <TwoCol>
            <AdminCard>
              <ListSkeleton />
            </AdminCard>
            <AdminCard>
              <ListSkeleton />
            </AdminCard>
          </TwoCol>
        </Section>
      </Page>
    );
  }

  if (status === "error") {
    return (
      <Page>
        <AdminCard>
          <AdminErrorState
            title="Unable to load the dashboard"
            description="Something went wrong while loading platform metrics."
            onRetry={() => {
              setStatus("loading");
              fetchDashboard();
            }}
          />
        </AdminCard>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeadRow>
        {lastUpdated && <LastUpdated>Last updated {formatRelative(lastUpdated)}</LastUpdated>}
        <RefreshButton
          type="button"
          disabled={refreshing}
          $spinning={refreshing}
          onClick={() => fetchDashboard({ isRefresh: true })}
        >
          <RefreshCw size={13} strokeWidth={2.4} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </RefreshButton>
      </PageHeadRow>

      <Section>
        <KpiGrid>
          <KpiCard>
            <KpiTop>
              <KpiLabel>Total trips</KpiLabel>
              <KpiIconWrap>
                <RouteIcon size={16} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{dashboard.totalTrips}</KpiValue>
            <KpiHelper>All trips ever posted on the platform</KpiHelper>
          </KpiCard>

          <KpiCard>
            <KpiTop>
              <KpiLabel>Total bookings</KpiLabel>
              <KpiIconWrap>
                <Package size={16} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{dashboard.totalBookings}</KpiValue>
            {bookingsWoWTrend ? (
              <KpiTrend $direction={bookingsWoWTrend.direction}>
                {bookingsWoWTrend.direction === "up" ? (
                  <TrendingUp size={13} strokeWidth={2.4} />
                ) : (
                  <TrendingDown size={13} strokeWidth={2.4} />
                )}
                {Math.abs(bookingsWoWTrend.pct).toFixed(1)}%
                <KpiTrendMuted>vs prior week</KpiTrendMuted>
              </KpiTrend>
            ) : (
              <KpiHelper>All booking requests created</KpiHelper>
            )}
          </KpiCard>

          <KpiCard>
            <KpiTop>
              <KpiLabel>Active trucks</KpiLabel>
              <KpiIconWrap>
                <TruckIcon size={16} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{dashboard.activeTrucks}</KpiValue>
            <KpiHelper>Verified trucks on the platform</KpiHelper>
          </KpiCard>

          <KpiCard>
            <KpiTop>
              <KpiLabel>Completed bookings</KpiLabel>
              <KpiIconWrap>
                <PackageCheck size={16} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{dashboard.completedBookings}</KpiValue>
            <KpiHelper>Bookings completed end-to-end</KpiHelper>
          </KpiCard>
        </KpiGrid>
      </Section>

      <Section>
        <TwoCol>
          <AdminCard>
            <SectionHead>
              <div>
                <SectionTitle>Bookings overview</SectionTitle>
                <SectionSubtitle>Bookings created per day</SectionSubtitle>
              </div>
              <RangeTabs>
                {RANGE_OPTIONS.map((opt) => (
                  <RangeTab key={opt.key} type="button" $active={range === opt.key} onClick={() => setRange(opt.key)}>
                    {opt.label}
                  </RangeTab>
                ))}
              </RangeTabs>
            </SectionHead>
            <BookingsTrendChart data={chartData} />
          </AdminCard>

          <AdminCard>
            <SectionHead>
              <div>
                <SectionTitle>Top routes</SectionTitle>
                <SectionSubtitle>Most-booked lanes on the platform</SectionSubtitle>
              </div>
            </SectionHead>
            <TopRoutesList routes={dashboard.topRoutes} />
          </AdminCard>
        </TwoCol>
      </Section>

      <Section>
        <AdminCard>
          <SectionHead>
            <div>
              <SectionTitle>Reports</SectionTitle>
              <SectionSubtitle>Export CSV data for offline analysis</SectionSubtitle>
            </div>
          </SectionHead>
          <ReportGrid>
            {REPORTS.map((r) => (
              <ReportCard key={r.key}>
                <ReportIcon>
                  <Download size={16} strokeWidth={2.2} />
                </ReportIcon>
                <ReportBody>
                  <ReportName>{r.label}</ReportName>
                  <ReportDescription>{r.description}</ReportDescription>
                  <ReportButton type="button" disabled={downloading === r.key} onClick={() => handleDownload(r.key)}>
                    {downloading === r.key ? "Downloading…" : "Download CSV"}
                  </ReportButton>
                </ReportBody>
              </ReportCard>
            ))}
          </ReportGrid>
        </AdminCard>
      </Section>

      <Section>
        <TwoCol>
          <AdminCard>
            <SectionHead>
              <div>
                <SectionTitle>Recent bookings</SectionTitle>
                <SectionSubtitle>Latest 5 across the platform</SectionSubtitle>
              </div>
              {dashboard.recentBookings?.length > 0 && (
                <ViewAllLink to="/admin/bookings">
                  View all <ArrowRight size={13} strokeWidth={2.4} />
                </ViewAllLink>
              )}
            </SectionHead>
            {dashboard.recentBookings?.length ? (
              <ActivityList>
                {dashboard.recentBookings.map((b) => (
                  <ActivityRow key={b._id}>
                    <Avatar name={b.shipper?.name} size={32} />
                    <ActivityBody>
                      <ActivityTitle as={Link} to={`/bookings/${b._id}`}>
                        {b.shipper?.name || "Shipper"}
                      </ActivityTitle>
                      <BookingRoute>
                        {b.trip ? (
                          <>
                            {b.trip.fromCity} <ArrowUpRight size={11} style={{ transform: "rotate(45deg)" }} />{" "}
                            {b.trip.toCity}
                            {b.trip.transporter?.name ? ` · ${b.trip.transporter.name}` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </BookingRoute>
                    </ActivityBody>
                    <ActivityRight>
                      <StatusBadge status={b.status} />
                      <ActivityTime>{formatRelative(b.createdAt)}</ActivityTime>
                    </ActivityRight>
                  </ActivityRow>
                ))}
              </ActivityList>
            ) : (
              <AdminEmptyState
                icon={Package}
                title="No bookings yet"
                description="Bookings will appear here once shippers start booking capacity."
              />
            )}
          </AdminCard>

          <AdminCard>
            <SectionHead>
              <div>
                <SectionTitle>Recent registrations</SectionTitle>
                <SectionSubtitle>Latest 5 sign-ups</SectionSubtitle>
              </div>
              {dashboard.recentRegistrations?.length > 0 && (
                <ViewAllLink to="/admin/users">
                  View all <ArrowRight size={13} strokeWidth={2.4} />
                </ViewAllLink>
              )}
            </SectionHead>
            {dashboard.recentRegistrations?.length ? (
              <ActivityList>
                {dashboard.recentRegistrations.map((u) => (
                  <ActivityRow key={u._id}>
                    <Avatar name={u.name} size={32} />
                    <ActivityBody>
                      <ActivityTitle as={Link} to={`/admin/users/${u._id}`}>
                        {u.name}
                      </ActivityTitle>
                      <ActivityMeta>{u.email}</ActivityMeta>
                    </ActivityBody>
                    <ActivityRight>
                      <Row role="presentation">
                        {(u.roles || []).map((r) => (
                          <StatusBadge key={r} status="verified">
                            {r}
                          </StatusBadge>
                        ))}
                      </Row>
                      <ActivityTime>{formatRelative(u.createdAt)}</ActivityTime>
                    </ActivityRight>
                  </ActivityRow>
                ))}
              </ActivityList>
            ) : (
              <AdminEmptyState
                icon={UsersIcon}
                title="No registrations yet"
                description="New shippers and transporters will appear here as they sign up."
              />
            )}
          </AdminCard>
        </TwoCol>
      </Section>
    </Page>
  );
};

export default Dashboard;
