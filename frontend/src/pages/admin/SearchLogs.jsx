import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Search as SearchIcon,
  Users as UsersIcon,
  Route as RouteIcon,
  AlertTriangle,
  Truck as TruckIcon,
  X,
  RefreshCw,
} from "lucide-react";
import * as adminApi from "../../api/admin";
import { Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import {
  Toolbar,
  AdminSearchInput,
  AdminSelect,
  AdminDateInput,
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
import { SkeletonBlock } from "../../components/ui/Skeleton";
import { fadeIn, scaleIn } from "../../theme/animations";
import { formatDate, formatDateTime, formatRelative } from "../../utils/format";

// This page answers one question the rest of the admin console can't: what
// are people ASKING for? Trips and bookings only ever show what the
// platform managed to supply — a lane fifty shippers searched and nobody
// served leaves no trace in either. So the reports here are deliberately
// ordered demand-first, and the zero-result numbers are given the same
// prominence as the volume ones rather than being buried as a footnote.

const RANGE_PRESETS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "custom", label: "Custom", days: null },
];

const ROUTE_SORTS = [
  { value: "searches", label: "Most searched" },
  { value: "searchers", label: "Most searchers" },
  { value: "zeroResults", label: "Biggest demand gap" },
  { value: "zeroRate", label: "Highest failure rate" },
  { value: "avgResults", label: "Fewest results" },
  { value: "recent", label: "Most recent" },
];

const SOURCES = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile app" },
  { value: "unknown", label: "Unknown" },
];

const ROLES = [
  { value: "guest", label: "Logged out" },
  { value: "shipper", label: "Shipper" },
  { value: "transporter", label: "Transporter" },
  { value: "admin", label: "Admin" },
];

const TABS = [
  { key: "routes", label: "Top routes" },
  { key: "cities", label: "City demand" },
  { key: "logs", label: "Raw log" },
];

// Early on — and on any narrow filter — the routes table fills with lanes
// somebody searched exactly once. They're real, but they bury the lanes with
// a pattern behind them, so the noise floor is adjustable.
const MIN_SEARCH_OPTIONS = [
  { value: "", label: "All lanes" },
  { value: "2", label: "2+ searches" },
  { value: "5", label: "5+ searches" },
  { value: "10", label: "10+ searches" },
];

const LABEL_BY_VALUE = (options) => Object.fromEntries(options.map((o) => [o.value, o.label]));
const SOURCE_LABEL = LABEL_BY_VALUE(SOURCES);
const ROLE_LABEL = LABEL_BY_VALUE(ROLES);

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const toDayString = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const daysAgo = (days) => toDayString(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");
const formatPercent = (ratio) => `${((ratio || 0) * 100).toFixed(1)}%`;

// The API's buckets are India calendar days ("2026-08-27"). Handing that
// string to `new Date()` parses it as UTC midnight, which renders as the
// PREVIOUS day for anyone viewing from a timezone behind UTC — so the parts
// are read out and rebuilt as a local date, keeping the label on the day
// the backend actually meant. (formatDate stays for real timestamps, which
// carry a zone of their own and don't have this problem.)
const formatDayLabel = (day) => {
  const [year, month, date] = String(day).split("-").map(Number);
  if (!year || !month || !date) return day;
  return new Date(year, month - 1, date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// A period-over-period change is only meaningful once there's a prior
// period to compare against — "+100%" off a base of zero is noise dressed
// up as a signal, so it renders as no delta at all.
const percentChange = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

// Loading is derived, never toggled inside an effect body: a request is "in
// flight" exactly when the key describing what's on screen no longer matches
// the key the held data was fetched for. Flipping a loading flag
// synchronously in the effect would cascade an extra render, and React 19's
// lint rule rightly rejects it.
const requestKey = (...parts) => JSON.stringify(parts);

const Page = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px 16px 56px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 24px 32px 64px;
  }
`;

const Section = styled.div`
  margin-top: 24px;

  &:first-child {
    margin-top: 0;
  }
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
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

const Panel = styled.div`
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.card};
  box-shadow: ${({ theme }) => theme.admin.shadow.card};
  padding: ${({ $padding }) => $padding || "18px"};
`;

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
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
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.admin.color.primaryDark : theme.admin.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.admin.color.surface : "transparent")};
  box-shadow: ${({ $active }) => ($active ? "0 1px 2px rgba(15,23,42,0.08)" : "none")};
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  background: ${({ theme }) => theme.admin.color.surface};
  font-size: 12.5px;
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

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const KpiLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const KpiIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: ${({ theme, $tone }) => theme.admin.color[$tone] || theme.admin.color.primary};
  background: ${({ theme, $tone }) => theme.admin.color[`${$tone}Soft`] || theme.admin.color.primarySoft};
`;

const KpiValue = styled.div`
  margin-top: 8px;
  font-size: 27px;
  font-weight: 700;
  line-height: 1.1;
  color: ${({ theme }) => theme.admin.color.text};
`;

const KpiFoot = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

// Green means "moved in the good direction", which is not the same as "went
// up" — a falling zero-result rate is the best news on this page, so the
// tone follows the metric's meaning rather than the sign of the number.
const Delta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 700;
  color: ${({ theme, $good }) => ($good ? theme.admin.color.success : theme.admin.color.danger)};
`;

const SkeletonTile = styled(SkeletonBlock)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.admin.color.bg} 25%,
    ${({ theme }) => theme.admin.color.border} 37%,
    ${({ theme }) => theme.admin.color.bg} 63%
  );
  background-size: 400% 100%;
`;

const ChartWrap = styled.div`
  position: relative;
`;

const GridLines = styled.div`
  position: absolute;
  inset: 0;
  bottom: 26px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
`;

const GridLine = styled.div`
  border-top: 1px dashed ${({ theme }) => theme.admin.color.border};
`;

const Bars = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 170px;
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

// One bar per day, split into the part of the day's demand that was served
// and the part that returned nothing — stacked rather than side-by-side so
// the bar's full height still reads as total demand at a glance.
const BarStack = styled.div`
  width: 100%;
  max-width: 20px;
  min-height: 3px;
  height: ${({ $pct }) => $pct}%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 3px 3px 0 0;
  overflow: hidden;
`;

const BarZero = styled.div`
  height: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.admin.color.danger};
`;

const BarServed = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.admin.color.primary};
  transition: background 0.15s ease;

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
  padding: 6px 9px;
  border-radius: 6px;
  background: ${({ theme }) => theme.admin.color.navy};
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.45;
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
  font-size: 11.5px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const BreakdownRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 7px 16px;
  margin-top: 15px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const BreakdownLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const BreakdownItem = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.admin.color.textSecondary};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const LegendDot = styled.span`
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  margin-right: 5px;
  background: ${({ theme, $tone }) => theme.admin.color[$tone]};
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const TabButton = styled.button`
  position: relative;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.admin.color.primaryDark : theme.admin.color.textSecondary)};

  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: ${({ theme, $active }) => ($active ? theme.admin.color.primary : "transparent")};
  }

  &:hover {
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

const RouteCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.admin.color.textMuted};
  }
`;

// A count and its rate belong together in one cell: 2 of 3 searches failing
// and 2 of 200 both read as "2" alone, and they mean opposite things.
const GapCell = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-weight: ${({ $severe }) => ($severe ? 700 : 500)};
  color: ${({ theme, $severe }) => ($severe ? theme.admin.color.danger : theme.admin.color.text)};
`;

const GapRate = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  animation: ${fadeIn} 0.15s ease;
`;

const DetailCard = styled(Card)`
  width: 100%;
  max-width: 760px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

  &:focus {
    outline: none;
  }
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const DetailBody = styled.div`
  padding: 18px 20px 22px;
  overflow: auto;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  color: ${({ theme }) => theme.admin.color.textMuted};

  &:hover {
    background: ${({ theme }) => theme.admin.color.bg};
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

const MiniGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const MiniStat = styled.div`
  padding: 11px 13px;
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  background: ${({ theme }) => theme.admin.color.bg};
`;

const MiniLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const MiniValue = styled.div`
  margin-top: 4px;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme, $tone }) => ($tone ? theme.admin.color[$tone] : theme.admin.color.text)};
`;

// The one line an operator actually acts on. Everything else on the
// drill-down is evidence; this is the reading.
const Verdict = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme, $tone }) => theme.admin.color[$tone === "danger" ? "danger" : "text"]};
  background: ${({ theme, $tone }) => theme.admin.color[`${$tone}Soft`] || theme.admin.color.bg};
  border: 1px solid ${({ theme, $tone }) => theme.admin.color[$tone] || theme.admin.color.border};

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const DateChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

const DateChip = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $gap }) => ($gap ? theme.admin.color.danger : theme.admin.color.text)};
  background: ${({ theme, $gap }) => ($gap ? theme.admin.color.dangerSoft : theme.admin.color.bg)};
  border: 1px solid ${({ theme, $gap }) => ($gap ? theme.admin.color.danger : theme.admin.color.border)};
`;

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  opacity: 0.75;
`;

const Footnote = styled.p`
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const KpiCard = ({ label, value, icon: Icon, tone = "primary", delta, deltaGoodWhen = "up", caption }) => {
  const good = delta === null || delta === undefined ? null : deltaGoodWhen === "up" ? delta >= 0 : delta <= 0;

  return (
    <Panel $padding="15px 16px">
      <KpiLabel>
        {label}
        <KpiIcon $tone={tone}>
          <Icon size={15} strokeWidth={2.2} />
        </KpiIcon>
      </KpiLabel>
      <KpiValue>{value}</KpiValue>
      <KpiFoot>
        {delta !== null && delta !== undefined ? (
          <>
            <Delta $good={good}>
              {delta >= 0 ? <ArrowUpRight size={13} strokeWidth={2.6} /> : <ArrowDownRight size={13} strokeWidth={2.6} />}
              {Math.abs(delta).toFixed(1)}%
            </Delta>
            vs previous period
          </>
        ) : (
          caption || "No prior period to compare"
        )}
      </KpiFoot>
    </Panel>
  );
};

const TrendChart = ({ trend }) => {
  const max = Math.max(...trend.map((d) => d.searches), 1);
  const first = trend[0];
  const last = trend[trend.length - 1];
  const middle = trend[Math.floor(trend.length / 2)];

  return (
    <ChartWrap>
      <GridLines aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <GridLine key={i} />
        ))}
      </GridLines>
      <Bars role="img" aria-label="Searches per day, with the zero-result share of each day highlighted">
        {trend.map((day) => (
          <BarCol key={day.day}>
            <BarTooltip>
              {formatDayLabel(day.day)}
              <br />
              {formatCount(day.searches)} searches
              {day.zeroResultSearches > 0 && ` · ${formatCount(day.zeroResultSearches)} with no results`}
            </BarTooltip>
            <BarStack $pct={Math.max((day.searches / max) * 100, day.searches > 0 ? 4 : 0)}>
              <BarServed />
              {day.zeroResultSearches > 0 && (
                <BarZero $pct={Math.min(100, (day.zeroResultSearches / Math.max(day.searches, 1)) * 100)} />
              )}
            </BarStack>
          </BarCol>
        ))}
      </Bars>
      <AxisRow>
        <span>{first ? formatDayLabel(first.day) : ""}</span>
        {trend.length > 8 && <span>{middle ? formatDayLabel(middle.day) : ""}</span>}
        <span>{last ? formatDayLabel(last.day) : ""}</span>
      </AxisRow>
    </ChartWrap>
  );
};

// Turns the numbers into the sentence an operator would otherwise have to
// derive themselves. The thresholds are deliberately coarse — this is a
// prompt to go look, not a scoring model.
const routeVerdict = (summary, supply) => {
  if (!summary) return null;

  if (supply.publishedTrips === 0 && summary.searches > 0) {
    return {
      tone: "danger",
      text: `${formatCount(summary.searches)} search${summary.searches === 1 ? "" : "es"} on this lane and no capacity posted at all right now. This is a lane to recruit transporters for.`,
    };
  }
  if (summary.zeroResultRate >= 0.5) {
    return {
      tone: "danger",
      text: `${formatPercent(summary.zeroResultRate)} of searches here came back empty — capacity exists but rarely on the dates shippers are asking for.`,
    };
  }
  if (summary.exactResults === 0 && summary.searches > 0) {
    return {
      tone: "warning",
      text: "Every result on this lane came from a trip merely passing through the corridor — no transporter is actually running this exact route.",
    };
  }
  return {
    tone: "success",
    text: `Healthy lane — ${formatCount(supply.publishedTrips)} upcoming trip${supply.publishedTrips === 1 ? "" : "s"} and ${formatPercent(summary.zeroResultRate)} of searches returning nothing.`,
  };
};

const RouteDetailModal = ({ routeKey, filters, onClose }) => {
  const [loaded, setLoaded] = useState({ key: null, data: null });

  const key = useMemo(() => requestKey(routeKey, filters), [routeKey, filters]);
  const loading = Boolean(routeKey) && loaded.key !== key;
  const detail = loaded.key === key ? loaded.data : null;

  useEffect(() => {
    if (!routeKey) return undefined;
    let cancelled = false;
    adminApi
      .getSearchRouteDetail({ ...filters, routeKey })
      .then((res) => {
        if (!cancelled) setLoaded({ key, data: res });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error.message);
        // Settle the key even on failure, so the panel shows its empty
        // state instead of spinning forever behind a toast.
        setLoaded({ key, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [routeKey, filters, key]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!routeKey) return null;

  const summary = detail?.summary;
  const supply = detail?.supply || { publishedTrips: 0, availableCapacity: 0, transporters: 0 };
  const verdict = routeVerdict(summary, supply);

  return (
    <Overlay onClick={onClose}>
      <DetailCard $variant="admin" tabIndex={-1} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <Stack $gap={0}>
            <strong style={{ fontSize: 16 }}>
              {detail ? `${detail.route.fromCity} → ${detail.route.toCity}` : "Loading route…"}
            </strong>
            <Muted>Demand and supply over the selected period</Muted>
          </Stack>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            <X size={17} strokeWidth={2.2} />
          </CloseButton>
        </DetailHeader>

        <DetailBody>
          {loading ? (
            <Stack $gap={3}>
              <SkeletonTile $width="100%" $height="70px" />
              <SkeletonTile $width="100%" $height="150px" />
            </Stack>
          ) : !summary ? (
            <EmptyState>
              <Muted>No searches recorded on this lane in the selected period.</Muted>
            </EmptyState>
          ) : (
            <Stack $gap={4}>
              {verdict && (
                <Verdict $tone={verdict.tone}>
                  <AlertTriangle size={15} strokeWidth={2.2} />
                  <span>{verdict.text}</span>
                </Verdict>
              )}

              <MiniGrid>
                <MiniStat>
                  <MiniLabel>Searches</MiniLabel>
                  <MiniValue>{formatCount(summary.searches)}</MiniValue>
                </MiniStat>
                <MiniStat>
                  <MiniLabel>Searchers</MiniLabel>
                  <MiniValue>{formatCount(summary.uniqueSearchers)}</MiniValue>
                </MiniStat>
                <MiniStat>
                  <MiniLabel>No results</MiniLabel>
                  <MiniValue $tone={summary.zeroResultSearches > 0 ? "danger" : undefined}>
                    {formatPercent(summary.zeroResultRate)}
                  </MiniValue>
                </MiniStat>
                <MiniStat>
                  <MiniLabel>Avg lead time</MiniLabel>
                  <MiniValue>{summary.avgLeadTimeDays}d</MiniValue>
                </MiniStat>
              </MiniGrid>

              <Stack $gap={2}>
                <SectionTitle>Current supply on this lane</SectionTitle>
                <MiniGrid>
                  <MiniStat>
                    <MiniLabel>Upcoming trips</MiniLabel>
                    <MiniValue $tone={supply.publishedTrips === 0 ? "danger" : undefined}>
                      {formatCount(supply.publishedTrips)}
                    </MiniValue>
                  </MiniStat>
                  <MiniStat>
                    <MiniLabel>Free capacity</MiniLabel>
                    <MiniValue>{formatCount(supply.availableCapacity)}t</MiniValue>
                  </MiniStat>
                  <MiniStat>
                    <MiniLabel>Transporters</MiniLabel>
                    <MiniValue>{formatCount(supply.transporters)}</MiniValue>
                  </MiniStat>
                  <MiniStat>
                    <MiniLabel>Avg results</MiniLabel>
                    <MiniValue>{summary.avgResults}</MiniValue>
                  </MiniStat>
                </MiniGrid>
              </Stack>

              {detail.trend?.length > 1 && (
                <Stack $gap={2}>
                  <SectionTitle>Searches per day</SectionTitle>
                  <TrendChart trend={detail.trend} />
                </Stack>
              )}

              {detail.travelDates?.length > 0 && (
                <Stack $gap={2}>
                  <SectionTitle>Dates shippers are asking for</SectionTitle>
                  <SectionSubtitle>
                    Red means every search for that shipping date came back empty — post capacity here first.
                  </SectionSubtitle>
                  <DateChips>
                    {detail.travelDates.map((d) => (
                      <DateChip key={d.day} $gap={d.zeroResultSearches === d.searches}>
                        {formatDayLabel(d.day)}
                        <ChipCount>×{d.searches}</ChipCount>
                      </DateChip>
                    ))}
                  </DateChips>
                </Stack>
              )}

              {detail.recentSearches?.length > 0 && (
                <Stack $gap={2}>
                  <SectionTitle>Recent searches</SectionTitle>
                  <TableScroll>
                    <Table $minWidth="520px">
                      <thead>
                        <tr>
                          <Th>When</Th>
                          <Th>Who</Th>
                          <Th>Shipping date</Th>
                          <Th>Results</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.recentSearches.map((row) => (
                          <Tr key={row._id}>
                            <Td>{formatRelative(row.createdAt)}</Td>
                            <Td>{row.user?.name || "Guest"}</Td>
                            <Td>{row.travelDate ? formatDate(row.travelDate) : "—"}</Td>
                            <Td>
                              <GapCell $severe={row.resultCount === 0}>{row.resultCount}</GapCell>
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableScroll>
                </Stack>
              )}
            </Stack>
          )}
        </DetailBody>
      </DetailCard>
    </Overlay>
  );
};

const CityTable = ({ title, subtitle, rows, loading }) => (
  <Panel $padding="0">
    <div style={{ padding: "15px 18px 0" }}>
      <SectionTitle>{title}</SectionTitle>
      <SectionSubtitle>{subtitle}</SectionSubtitle>
    </div>
    {!loading && rows.length === 0 ? (
      <EmptyState style={{ margin: 18 }}>
        <Muted>No city demand recorded yet.</Muted>
      </EmptyState>
    ) : (
      <TableScroll>
        <Table $minWidth="440px">
          <thead>
            <tr>
              <IndexTh>#</IndexTh>
              <Th>City</Th>
              <Th>Searches</Th>
              <Th>Searchers</Th>
              <Th>Lanes</Th>
              <Th>No results</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminSkeletonRows rows={6} cols={6} />
            ) : (
              rows.map((city, i) => (
                <Tr key={city.cityNormalized}>
                  <IndexTd>{i + 1}</IndexTd>
                  <Td style={{ fontWeight: 600 }}>{city.city}</Td>
                  <Td>{formatCount(city.searches)}</Td>
                  <Td>{formatCount(city.uniqueSearchers)}</Td>
                  <Td>{formatCount(city.routes)}</Td>
                  <Td>
                    <GapCell $severe={city.zeroResultRate >= 0.5}>
                      {formatCount(city.zeroResultSearches)}
                      <GapRate>{formatPercent(city.zeroResultRate)}</GapRate>
                    </GapCell>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </TableScroll>
    )}
  </Panel>
);

export const SearchLogs = () => {
  const [rangeKey, setRangeKey] = useState("30");
  const [customFrom, setCustomFrom] = useState(daysAgo(30));
  const [customTo, setCustomTo] = useState(daysAgo(0));
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [source, setSource] = useState("");
  const [role, setRole] = useState("");
  const [zeroOnly, setZeroOnly] = useState(false);

  const [tab, setTab] = useState("routes");
  const [routeSort, setRouteSort] = useState("searches");
  const [minSearches, setMinSearches] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loadedHeaderKey, setLoadedHeaderKey] = useState(null);

  const [routes, setRoutes] = useState({ items: [], total: 0, pages: 1 });
  const [cities, setCities] = useState({ origins: [], destinations: [] });
  const [logs, setLogs] = useState({ items: [], total: 0, pages: 1 });
  const [loadedTabKey, setLoadedTabKey] = useState(null);

  const [detailRouteKey, setDetailRouteKey] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // The text box is the only filter that fires per keystroke, so it's the
  // only one that needs debouncing — every select/date change is a single
  // deliberate action and should refetch immediately.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // One filter bag, shared by the KPIs, the chart, all three tabs, the
  // drill-down and both exports — so every number on screen is describing
  // the same slice of data, and Export hands back exactly what's displayed.
  const filters = useMemo(() => {
    const preset = RANGE_PRESETS.find((r) => r.key === rangeKey);
    const range =
      rangeKey === "custom"
        ? { from: customFrom || undefined, to: customTo || undefined }
        : { from: daysAgo(preset?.days ?? 30) };

    return {
      ...range,
      q: debouncedQ || undefined,
      source: source || undefined,
      role: role || undefined,
      zeroOnly: zeroOnly ? "true" : undefined,
    };
  }, [rangeKey, customFrom, customTo, debouncedQ, source, role, zeroOnly]);

  const hasFilters = Boolean(debouncedQ || source || role || zeroOnly || minSearches || rangeKey !== "30");

  const headerKey = useMemo(() => requestKey(filters, reloadToken), [filters, reloadToken]);
  const routeOptions = useMemo(
    () => ({ sort: routeSort, minSearches: minSearches || undefined }),
    [routeSort, minSearches]
  );
  const tabKey = useMemo(
    () => requestKey(filters, tab, routeOptions, page, pageSize, reloadToken),
    [filters, tab, routeOptions, page, pageSize, reloadToken]
  );
  const headerLoading = loadedHeaderKey !== headerKey;
  const tabLoading = loadedTabKey !== tabKey;

  // Narrowing a filter can leave you on page 7 of a 2-page result, which
  // renders as an empty table rather than the rows that do match. Adjusting
  // during render (React's documented pattern for "state that depends on
  // props/state changing") resets it before that empty frame is ever
  // painted — an effect would show it first, then correct itself.
  const filterScopeKey = useMemo(() => requestKey(filters, tab, routeOptions), [filters, tab, routeOptions]);
  const [lastFilterScope, setLastFilterScope] = useState(filterScopeKey);
  if (lastFilterScope !== filterScopeKey) {
    setLastFilterScope(filterScopeKey);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminApi.getSearchAnalyticsSummary(filters), adminApi.getSearchAnalyticsTrends(filters)])
      .then(([summaryRes, trendRes]) => {
        if (cancelled) return;
        setSummary(summaryRes);
        setTrend(trendRes.trend || []);
        setLoadedHeaderKey(headerKey);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error.message);
        // Settle the key regardless, so a failed refresh falls back to the
        // empty state instead of leaving skeletons on screen forever.
        setLoadedHeaderKey(headerKey);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, headerKey]);

  useEffect(() => {
    let cancelled = false;

    const request =
      tab === "routes"
        ? adminApi.listSearchRoutes({ ...filters, ...routeOptions, page, limit: pageSize }).then((res) => {
            if (!cancelled) setRoutes({ items: res.items || [], total: res.total || 0, pages: res.pages || 1 });
          })
        : tab === "cities"
          ? adminApi.listSearchCities(filters).then((res) => {
              if (!cancelled) setCities({ origins: res.origins || [], destinations: res.destinations || [] });
            })
          : adminApi.listSearchLogs({ ...filters, page, limit: pageSize }).then((res) => {
              if (!cancelled) setLogs({ items: res.items || [], total: res.total || 0, pages: res.pages || 1 });
            });

    request
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadedTabKey(tabKey);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, filters, routeOptions, page, pageSize, tabKey]);

  const clearFilters = useCallback(() => {
    setQ("");
    setDebouncedQ("");
    setSource("");
    setRole("");
    setZeroOnly(false);
    setRangeKey("30");
    setMinSearches("");
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      if (tab === "logs") {
        await adminApi.downloadSearchLogsCsv(filters);
      } else {
        await adminApi.downloadSearchRoutesCsv({ ...filters, ...routeOptions });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }, [tab, filters, routeOptions]);

  const totals = summary?.totals;
  const previous = summary?.previousTotals;
  const isEmpty = !headerLoading && totals?.searches === 0;

  return (
    <Page>
      <HeadRow>
        <Legend>
          <span>
            <LegendDot $tone="primary" />
            Searches with results
          </span>
          <span>
            <LegendDot $tone="danger" />
            No results
          </span>
        </Legend>
        <Row $gap={2} style={{ flexWrap: "wrap" }}>
          <RangeTabs>
            {RANGE_PRESETS.map((preset) => (
              <RangeTab
                key={preset.key}
                type="button"
                $active={rangeKey === preset.key}
                onClick={() => setRangeKey(preset.key)}
              >
                {preset.label}
              </RangeTab>
            ))}
          </RangeTabs>
          {rangeKey === "custom" && (
            <>
              <AdminDateInput value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="From date" />
              <AdminDateInput value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="To date" />
            </>
          )}
          <GhostButton type="button" onClick={() => setReloadToken((n) => n + 1)} disabled={headerLoading}>
            <RefreshCw size={13} strokeWidth={2.4} />
            Refresh
          </GhostButton>
        </Row>
      </HeadRow>

      <Section>
        {headerLoading || !totals ? (
          <KpiGrid>
            {[0, 1, 2, 3].map((i) => (
              <Panel key={i} $padding="15px 16px">
                <SkeletonTile $width="70px" $height="11px" />
                <div style={{ marginTop: 12 }}>
                  <SkeletonTile $width="55%" $height="26px" />
                </div>
              </Panel>
            ))}
          </KpiGrid>
        ) : (
          <KpiGrid>
            <KpiCard
              label="Searches"
              value={formatCount(totals.searches)}
              icon={SearchIcon}
              tone="primary"
              delta={percentChange(totals.searches, previous?.searches)}
              deltaGoodWhen="up"
            />
            <KpiCard
              label="Searchers"
              value={formatCount(totals.uniqueSearchers)}
              icon={UsersIcon}
              tone="info"
              delta={percentChange(totals.uniqueSearchers, previous?.uniqueSearchers)}
              deltaGoodWhen="up"
              caption="Approximate for logged-out visitors"
            />
            <KpiCard
              label="No results"
              value={formatPercent(totals.zeroResultRate)}
              icon={AlertTriangle}
              tone="danger"
              delta={percentChange(totals.zeroResultRate, previous?.zeroResultRate)}
              deltaGoodWhen="down"
            />
            <KpiCard
              label="Lanes searched"
              value={formatCount(summary.distinctRoutes)}
              icon={RouteIcon}
              tone="success"
              caption={`${totals.avgResults} results per search on average`}
            />
          </KpiGrid>
        )}
      </Section>

      {!isEmpty && (
        <Section>
          <Panel>
            <SectionHead>
              <div>
                <SectionTitle>Search volume</SectionTitle>
                <SectionSubtitle>
                  Daily searches, with the share that returned no trips shown in red.
                </SectionSubtitle>
              </div>
            </SectionHead>
            {headerLoading ? <SkeletonTile $width="100%" $height="170px" /> : <TrendChart trend={trend} />}
            {!headerLoading && totals?.searches > 0 && (
              <BreakdownRow>
                <BreakdownLabel>Came from</BreakdownLabel>
                {summary.bySource.map((entry) => (
                  <BreakdownItem key={entry._id}>
                    <strong>{SOURCE_LABEL[entry._id] || entry._id}</strong> {formatCount(entry.searches)} (
                    {formatPercent(entry.searches / totals.searches)})
                  </BreakdownItem>
                ))}
                <BreakdownLabel>Searched by</BreakdownLabel>
                {summary.byRole.map((entry) => (
                  <BreakdownItem key={entry._id}>
                    <strong>{ROLE_LABEL[entry._id] || entry._id}</strong> {formatCount(entry.searches)} (
                    {formatPercent(entry.searches / totals.searches)})
                  </BreakdownItem>
                ))}
              </BreakdownRow>
            )}
          </Panel>
        </Section>
      )}

      {!headerLoading && summary?.gapRoutes?.length > 0 && (
        <Section>
          <SectionHead>
            <div>
              <SectionTitle>Biggest demand gaps</SectionTitle>
              <SectionSubtitle>
                Lanes shippers searched hardest and found nothing — the shortlist for recruiting transporters.
              </SectionSubtitle>
            </div>
          </SectionHead>
          <Panel $padding="0">
            <TableScroll>
              <Table $minWidth="620px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Lane</Th>
                    <Th>Failed searches</Th>
                    <Th>Searchers</Th>
                    <Th>Last searched</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {summary.gapRoutes.map((route, i) => (
                    <Tr key={route.routeKey}>
                      <IndexTd>{i + 1}</IndexTd>
                      <Td>
                        <RouteCell>
                          {route.fromCity} <ArrowRight size={13} strokeWidth={2.4} /> {route.toCity}
                        </RouteCell>
                      </Td>
                      <Td>
                        <GapCell $severe>
                          {formatCount(route.zeroResultSearches)}
                          <GapRate>{formatPercent(route.zeroResultRate)}</GapRate>
                        </GapCell>
                      </Td>
                      <Td>{formatCount(route.uniqueSearchers)}</Td>
                      <Td>{formatRelative(route.lastSearchedAt)}</Td>
                      <Td>
                        <Button
                          type="button"
                          $variant="secondary"
                          $size="sm"
                          onClick={() => setDetailRouteKey(route.routeKey)}
                        >
                          Inspect
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          </Panel>
        </Section>
      )}

      <Section>
        <TabBar role="tablist">
          {TABS.map((t) => (
            <TabButton key={t.key} type="button" role="tab" aria-selected={tab === t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </TabButton>
          ))}
        </TabBar>

        <Toolbar>
          <AdminSearchInput
            placeholder="Filter by city — either end of the lane…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {tab === "routes" && (
            <AdminSelect value={routeSort} onChange={(e) => setRouteSort(e.target.value)} aria-label="Sort routes by">
              {ROUTE_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </AdminSelect>
          )}
          {tab === "routes" && (
            <AdminSelect
              value={minSearches}
              onChange={(e) => setMinSearches(e.target.value)}
              aria-label="Hide lanes below a search count"
            >
              {MIN_SEARCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </AdminSelect>
          )}
          <AdminSelect value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by who searched">
            <option value="">Everyone</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={zeroOnly ? "true" : ""}
            onChange={(e) => setZeroOnly(e.target.value === "true")}
            aria-label="Filter by result outcome"
          >
            <option value="">All outcomes</option>
            <option value="true">No results only</option>
          </AdminSelect>
          <ToolbarSpacer />
          {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
          {tab !== "cities" && (
            <GhostButton type="button" onClick={handleExport} disabled={exporting || tabLoading}>
              <Download size={13} strokeWidth={2.4} />
              Export CSV
            </GhostButton>
          )}
          {!tabLoading && tab === "routes" && <ResultsCount>{formatCount(routes.total)} lanes</ResultsCount>}
          {!tabLoading && tab === "logs" && <ResultsCount>{formatCount(logs.total)} searches</ResultsCount>}
        </Toolbar>

        {tab === "cities" ? (
          <TwoCol>
            <CityTable
              title="Shipping from"
              subtitle="Where demand originates — cities that need transporters based nearby."
              rows={cities.origins}
              loading={tabLoading}
            />
            <CityTable
              title="Shipping to"
              subtitle="Where demand is headed — cities that need return-load capacity."
              rows={cities.destinations}
              loading={tabLoading}
            />
          </TwoCol>
        ) : (
          <AdminCard $padding="0">
            {!tabLoading && (tab === "routes" ? routes.items : logs.items).length === 0 ? (
              <EmptyState style={{ margin: 20 }}>
                <Muted>
                  {isEmpty
                    ? "No searches recorded yet. Rows appear here as visitors search for trips."
                    : "No searches match these filters."}
                </Muted>
              </EmptyState>
            ) : (
              <>
                <TableScroll>
                  {tab === "routes" ? (
                    <Table $minWidth="900px">
                      <thead>
                        <tr>
                          <IndexTh>#</IndexTh>
                          <Th>Lane</Th>
                          <Th>Searches</Th>
                          <Th>Searchers</Th>
                          <Th>No results</Th>
                          <Th>Avg results</Th>
                          <Th>Lead time</Th>
                          <Th>Last searched</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {tabLoading ? (
                          <AdminSkeletonRows rows={Math.min(pageSize, 10)} cols={9} />
                        ) : (
                          routes.items.map((route, i) => (
                            <Tr key={route.routeKey}>
                              <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                              <Td>
                                <RouteCell>
                                  {route.fromCity} <ArrowRight size={13} strokeWidth={2.4} /> {route.toCity}
                                </RouteCell>
                              </Td>
                              <Td style={{ fontWeight: 600 }}>{formatCount(route.searches)}</Td>
                              <Td>{formatCount(route.uniqueSearchers)}</Td>
                              <Td>
                                <GapCell $severe={route.zeroResultRate >= 0.5}>
                                  {formatCount(route.zeroResultSearches)}
                                  <GapRate>{formatPercent(route.zeroResultRate)}</GapRate>
                                </GapCell>
                              </Td>
                              <Td>{route.avgResults}</Td>
                              <Td>{route.avgLeadTimeDays}d</Td>
                              <Td>{formatRelative(route.lastSearchedAt)}</Td>
                              <Td>
                                <Button
                                  type="button"
                                  $variant="secondary"
                                  $size="sm"
                                  onClick={() => setDetailRouteKey(route.routeKey)}
                                >
                                  Inspect
                                </Button>
                              </Td>
                            </Tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  ) : (
                    <Table $minWidth="980px">
                      <thead>
                        <tr>
                          <IndexTh>#</IndexTh>
                          <Th>Searched at</Th>
                          <Th>Lane</Th>
                          <Th>Shipping date</Th>
                          <Th>Results</Th>
                          <Th>Refinements</Th>
                          <Th>Who</Th>
                          <Th>Source</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabLoading ? (
                          <AdminSkeletonRows rows={Math.min(pageSize, 10)} cols={8} />
                        ) : (
                          logs.items.map((row, i) => (
                            <Tr key={row._id}>
                              <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                              <Td>{formatDateTime(row.createdAt)}</Td>
                              <Td>
                                {row.searchType === "near" ? (
                                  <Muted style={{ margin: 0 }}>Near-me search</Muted>
                                ) : (
                                  <RouteCell>
                                    {row.fromCity} <ArrowRight size={13} strokeWidth={2.4} /> {row.toCity}
                                  </RouteCell>
                                )}
                              </Td>
                              <Td>{row.travelDate ? formatDate(row.travelDate) : "—"}</Td>
                              <Td>
                                <GapCell $severe={row.resultCount === 0}>{row.resultCount}</GapCell>
                              </Td>
                              <Td>{row.refineCount || "—"}</Td>
                              <Td>
                                {row.user?.name || "Guest"}
                                {row.user?.email && (
                                  <Muted style={{ fontSize: 12, margin: 0 }}>{row.user.email}</Muted>
                                )}
                              </Td>
                              <Td>{row.source}</Td>
                            </Tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  )}
                </TableScroll>
                <div style={{ padding: "0 20px 16px" }}>
                  {!tabLoading && (
                    <Pagination
                      variant="admin"
                      page={page}
                      pages={tab === "routes" ? routes.pages : logs.pages}
                      total={tab === "routes" ? routes.total : logs.total}
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
        )}

        <Footnote>
          <TruckIcon size={12} strokeWidth={2.4} style={{ verticalAlign: -1, marginRight: 5 }} />
          One row is one search intent, not one request — re-running the same lane and date within a few minutes
          (changing the sort or capacity filter) counts once, with the extra runs shown as refinements. Searcher counts
          are exact for signed-in users and approximate for logged-out visitors.
          {summary?.retentionDays ? ` Search logs older than ${summary.retentionDays} days are removed automatically.` : ""}
        </Footnote>
      </Section>

      <RouteDetailModal routeKey={detailRouteKey} filters={filters} onClose={() => setDetailRouteKey(null)} />
    </Page>
  );
};

export default SearchLogs;
