import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { searchTrips, saveSearchAlert } from "../api/trips";
import { BASE_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageContainer, Stack, Row, Grid, PageTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Form";
import { Spinner } from "../components/ui/Spinner";
import { formatDate, formatDateTime, formatINR, formatTons, formatCbm, ratingLabel } from "../utils/format";
import { fadeInUp } from "../theme/animations";

const ResultCard = styled(Card)`
  display: block;
  animation: ${fadeInUp} 0.3s ease both;
  animation-delay: ${({ $i = 0 }) => Math.min($i * 0.05, 0.35)}s;
`;

const Route = styled.div`
  font-weight: 700;
  font-size: 16px;
`;

const Thumbnail = styled.img`
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.md};
  flex-shrink: 0;
`;

const Price = styled.div`
  font-weight: 800;
  font-size: 18px;
  color: ${({ theme }) => theme.color.accent};
`;

const FilterBar = styled(Card)`
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space(3)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: 1fr 1fr 1fr;
    align-items: end;
  }
`;

export const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fromCity = searchParams.get("fromCity") || "";
  const toCity = searchParams.get("toCity") || "";
  const date = searchParams.get("date") || "";
  const sort = searchParams.get("sort") || "departure";
  const minCapacity = searchParams.get("minCapacity") || "";
  const minVolumeCbm = searchParams.get("minVolumeCbm") || "";

  const [minCapacityInput, setMinCapacityInput] = useState(minCapacity);
  const [minVolumeCbmInput, setMinVolumeCbmInput] = useState(minVolumeCbm);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);

  const hasQuery = Boolean(fromCity && toCity && date);

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    searchTrips({
      fromCity,
      toCity,
      date,
      sort,
      minCapacity: minCapacity || undefined,
      minVolumeCbm: minVolumeCbm || undefined,
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
  }, [fromCity, toCity, date, sort, minCapacity, minVolumeCbm]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleMinCapacityBlur = () => updateParam("minCapacity", minCapacityInput);
  const handleMinVolumeCbmBlur = () => updateParam("minVolumeCbm", minVolumeCbmInput);

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
          <Muted>{formatDate(date)}</Muted>
        </Stack>

        <FilterBar>
          <FilterRow>
            <Field label="Sort by">
              <Select value={sort} onChange={(e) => updateParam("sort", e.target.value)}>
                <option value="departure">Departure (soonest)</option>
                <option value="price">Price per ton (lowest)</option>
                <option value="rating">Transporter rating</option>
              </Select>
            </Field>
            <Field label="Min. capacity (tons)">
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="Any"
                value={minCapacityInput}
                onChange={(e) => setMinCapacityInput(e.target.value)}
                onBlur={handleMinCapacityBlur}
                onKeyDown={(e) => e.key === "Enter" && handleMinCapacityBlur()}
              />
            </Field>
            <Field label="Min. volume (m³, optional)">
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="Any"
                value={minVolumeCbmInput}
                onChange={(e) => setMinVolumeCbmInput(e.target.value)}
                onBlur={handleMinVolumeCbmBlur}
                onKeyDown={(e) => e.key === "Enter" && handleMinVolumeCbmBlur()}
              />
            </Field>
          </FilterRow>
        </FilterBar>

        {loading ? (
          <Row $gap={2}>
            <Spinner />
            <Muted>Searching…</Muted>
          </Row>
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
          <Grid $cols={1} $colsTablet={2}>
            {trips.map((trip, i) => (
              <ResultCard as={Link} to={`/trips/${trip._id}`} key={trip._id} $i={i} $interactive>
                <Row $gap={4} style={{ alignItems: "flex-start" }}>
                  {trip.truck?.photos?.[0]?.url && (
                    <Thumbnail src={`${BASE_URL}${trip.truck.photos[0].url}`} alt="" />
                  )}
                  <Stack $gap={3} style={{ flex: 1, minWidth: 0 }}>
                    <CardRow>
                      <Route>
                        {trip.truck?.truckType || "Truck"}
                        {trip.truck?.bodyType ? ` · ${trip.truck.bodyType}` : ""}
                      </Route>
                      <Price>{formatINR(trip.pricePerTon)}/t</Price>
                    </CardRow>

                    <Row $gap={4} $wrap>
                      <Muted>Available: {formatTons(trip.availableCapacity)}</Muted>
                      {trip.volumeCbm != null && <Muted>Volume: {formatCbm(trip.availableVolumeCbm)}</Muted>}
                      <Muted>Departs: {formatDateTime(trip.departureAt)}</Muted>
                    </Row>

                    <CardRow>
                      <Muted>
                        {trip.transporter?.name || "Transporter"}
                        {trip.transporter?.city ? ` · ${trip.transporter.city}` : ""}
                      </Muted>
                      <Muted>{ratingLabel(trip.transporter?.ratingAvg, trip.transporter?.ratingCount)}</Muted>
                    </CardRow>
                  </Stack>
                </Row>
              </ResultCard>
            ))}
          </Grid>
        )}
      </Stack>
    </PageContainer>
  );
};

export default SearchResults;
