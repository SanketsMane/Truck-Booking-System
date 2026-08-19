import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styled, { css } from "styled-components";
import { toast } from "react-toastify";
import { ChevronRight, Truck } from "lucide-react";
import { searchTrips, saveSearchAlert } from "../api/trips";
import { BASE_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageContainer, Stack, Row, PageTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Form";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { SkeletonBlock, SkeletonText } from "../components/ui/Skeleton";
import { formatDate, formatINR, formatTons, ratingLabel } from "../utils/format";
import { fadeInUp } from "../theme/animations";
import { useUnitAmount } from "../hooks/useUnitAmount";
import { usePageMeta } from "../hooks/usePageMeta";

const ResultCard = styled(Card).attrs({ $padding: "0" })`
  display: block;
  overflow: hidden;
  animation: ${fadeInUp} 0.3s ease both;
  animation-delay: ${({ $i = 0 }) => Math.min($i * 0.05, 0.35)}s;
`;

const ResultRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  flex-wrap: wrap;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-wrap: nowrap;
  }
`;

const TimeCol = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 70px;
`;

const TimeValue = styled.div`
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.01em;
`;

const TimeMuted = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Divider = styled.div`
  width: 1px;
  align-self: stretch;
  background: ${({ theme }) => theme.color.border};
  flex-shrink: 0;
`;

const InfoCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
`;

const TruckThumb = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.sm};
  flex-shrink: 0;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TruckLine = styled.div`
  font-weight: 700;
  font-size: 15px;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const PriceCol = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  justify-content: space-between;
  gap: 2px;
  width: 100%;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-top: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(1)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-shrink: 0;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    width: auto;
    min-width: 92px;
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }
`;

const Price = styled.div`
  font-weight: 800;
  font-size: 18px;
  color: ${({ theme }) => theme.color.accent};
`;

const ChevronCol = styled.div`
  display: none;
  align-items: center;
  color: ${({ theme }) => theme.color.textFaint};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: flex;
  }
`;

const ResultList = styled(Stack).attrs({ $gap: 3 })``;

const SkeletonPriceCol = styled(PriceCol)`
  align-items: flex-start;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    align-items: flex-end;
  }
`;

// Mirrors ResultRow's actual layout (time / divider / truck+text / price)
// so the loading state previews the real content's shape instead of just
// a generic spinner.
const ResultSkeletonRow = ({ i }) => (
  <ResultCard $i={i}>
    <ResultRow>
      <TimeCol>
        <SkeletonText $width="48px" $size="19px" />
        <SkeletonBlock $width="60px" $height="12px" style={{ marginTop: 4 }} />
      </TimeCol>
      <Divider />
      <InfoCol>
        <Row $gap={3}>
          <SkeletonBlock $width="44px" $height="44px" $radius="10px" />
          <Stack $gap={1} style={{ flex: 1 }}>
            <SkeletonText $width="140px" />
            <SkeletonBlock $width="180px" $height="12px" />
          </Stack>
        </Row>
        <SkeletonBlock $width="120px" $height="12px" />
      </InfoCol>
      <SkeletonPriceCol>
        <SkeletonText $width="70px" $size="18px" />
        <SkeletonBlock $width="45px" $height="12px" />
      </SkeletonPriceCol>
    </ResultRow>
  </ResultCard>
);

const FilterBar = styled(Card)`
  padding: ${({ theme }) => theme.space(4)};
  position: sticky;
  top: calc(var(--navbar-height, 60px) + 12px);
  z-index: 5;
`;

const SortRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

const SortPill = styled.button`
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textMuted};
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
  }

  ${({ $active }) =>
    $active &&
    css`
      border-color: ${({ theme }) => theme.color.accent};
      background: ${({ theme }) => theme.color.accentSoft};
      color: ${({ theme }) => theme.color.accentStrong};
    `}
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(3)};
  max-width: 260px;
`;

const SORT_OPTIONS = [
  { value: "departure", label: "Soonest departure" },
  { value: "price", label: "Lowest price" },
  { value: "rating", label: "Top rated" },
];

const formatTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

const formatShortDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fromCity = searchParams.get("fromCity") || "";
  const toCity = searchParams.get("toCity") || "";
  const date = searchParams.get("date") || "";
  const sort = searchParams.get("sort") || "departure";
  const minCapacity = searchParams.get("minCapacity") || "";

  const minCapacityAmount = useUnitAmount(minCapacity);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);

  const hasQuery = Boolean(fromCity && toCity && date);

  usePageMeta(
    hasQuery
      ? {
          title: `Truck capacity from ${fromCity} to ${toCity}`,
          description: `Compare available truck capacity from ${fromCity} to ${toCity} on Truckgee — matched by route, zero commission, direct booking.`,
        }
      : {
          title: "Search trucks",
          description: "Search for available truck capacity by route and date on Truckgee — zero commission, direct booking.",
        }
  );

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    searchTrips({
      fromCity,
      toCity,
      date,
      sort,
      minCapacity: minCapacity || undefined,
    })
      .then(({ trips }) => {
        if (cancelled) return;
        setTrips(trips || []);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCity, toCity, date, sort, minCapacity]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleMinCapacityBlur = () => updateParam("minCapacity", minCapacityAmount.tons);

  const handleNotifyMe = async () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/search", search: `?${searchParams}` } } });
      return;
    }
    setSavingAlert(true);
    try {
      const res = await saveSearchAlert({ fromCity, toCity, date });
      toast.success(res.msg || "We'll notify you when a matching trip is posted");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingAlert(false);
    }
  };

  if (!hasQuery) {
    return (
      <PageContainer>
        <PageTitle>Available Trucks</PageTitle>
        <EmptyState>
          <p>Start a search from the home page to see available capacity.</p>
          <Button as={Link} to="/" $size="sm">
            Go to search
          </Button>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack $gap={5}>
        <Stack $gap={1}>
          <PageTitle>
            {fromCity} → {toCity}
          </PageTitle>
          <Muted>
            {formatDate(date)}
            {!loading && !error ? ` · ${trips.length} ${trips.length === 1 ? "truck" : "trucks"} found` : ""}
          </Muted>
        </Stack>

        <FilterBar>
          <SortRow>
            {SORT_OPTIONS.map((opt) => (
              <SortPill
                key={opt.value}
                type="button"
                $active={sort === opt.value}
                onClick={() => updateParam("sort", opt.value)}
              >
                {opt.label}
              </SortPill>
            ))}
          </SortRow>
          <FilterRow>
            <Field label="Min. capacity">
              <UnitAmountInput
                value={minCapacityAmount.displayValue}
                unit={minCapacityAmount.unit}
                onValueChange={minCapacityAmount.onValueChange}
                onUnitChange={minCapacityAmount.onUnitChange}
                placeholder="Any"
                onBlur={handleMinCapacityBlur}
                onKeyDown={(e) => e.key === "Enter" && handleMinCapacityBlur()}
              />
            </Field>
          </FilterRow>
        </FilterBar>

        {loading ? (
          <ResultList aria-busy="true" aria-label="Searching">
            {[0, 1, 2].map((i) => (
              <ResultSkeletonRow key={i} i={i} />
            ))}
          </ResultList>
        ) : error ? (
          <EmptyState>
            <p>{error}</p>
          </EmptyState>
        ) : trips.length === 0 ? (
          <EmptyState>
            <Stack $gap={4}>
              <p>No trips found for this route on this date.</p>
              <div>
                <Button onClick={handleNotifyMe} disabled={savingAlert}>
                  {savingAlert ? "Saving…" : "Notify me when a matching trip is posted"}
                </Button>
              </div>
            </Stack>
          </EmptyState>
        ) : (
          <ResultList>
            {trips.map((trip, i) => (
              <ResultCard
                as={Link}
                to={minCapacity ? `/trips/${trip._id}?capacity=${minCapacity}` : `/trips/${trip._id}`}
                key={trip._id}
                $i={i}
                $interactive
              >
                <ResultRow>
                  <TimeCol>
                    <TimeValue>{formatTime(trip.departureAt)}</TimeValue>
                    <TimeMuted>{formatShortDate(trip.departureAt)}</TimeMuted>
                  </TimeCol>

                  <Divider />

                  <InfoCol>
                    <Row $gap={3}>
                      <TruckThumb>
                        {trip.truck?.photos?.[0]?.url ? (
                          <img src={`${BASE_URL}${trip.truck.photos[0].url}`} alt="" loading="lazy" />
                        ) : (
                          <Truck size={20} strokeWidth={2.2} />
                        )}
                      </TruckThumb>
                      <div>
                        <TruckLine>
                          {trip.truck?.truckType || "Truck"}
                          {trip.truck?.bodyType ? ` · ${trip.truck.bodyType}` : ""}
                        </TruckLine>
                        <Muted>
                          {trip.transporter?.name || "Transporter"}
                          {trip.transporter?.city ? ` · ${trip.transporter.city}` : ""}
                          {" · "}
                          {ratingLabel(trip.transporter?.ratingAvg, trip.transporter?.ratingCount)}
                        </Muted>
                      </div>
                    </Row>
                    <BadgeRow>
                      <span>Available: {formatTons(trip.visibleAvailableCapacity)}</span>
                      {trip.estimatedArrivalAt && (
                        <span>
                          ETA: {formatShortDate(trip.estimatedArrivalAt)}, {formatTime(trip.estimatedArrivalAt)}
                        </span>
                      )}
                    </BadgeRow>
                  </InfoCol>

                  <PriceCol>
                    <Price>{formatINR(trip.pricePerTon)}/t</Price>
                    <Muted>per ton</Muted>
                  </PriceCol>

                  <ChevronCol>
                    <ChevronRight size={20} strokeWidth={2.2} />
                  </ChevronCol>
                </ResultRow>
              </ResultCard>
            ))}
          </ResultList>
        )}
      </Stack>
    </PageContainer>
  );
};

export default SearchResults;
