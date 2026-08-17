import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Check, Truck as TruckIcon } from "lucide-react";
import { postTrip } from "../api/trips";
import { listMyTrucks } from "../api/trucks";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, SubHeading, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { Spinner } from "../components/ui/Spinner";
import { formatINR, formatTons, toDateTimeInputValue } from "../utils/format";
import { useUnitAmount } from "../hooks/useUnitAmount";

const STEPS = ["Route", "Truck", "Capacity", "Review"];

const StepRow = styled(Row)`
  overflow-x: auto;
  padding-bottom: 4px;
`;

const StepPill = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px 7px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  font-weight: 700;
  border: 1px solid
    ${({ theme, $active, $done }) => ($active ? theme.color.accent : $done ? theme.color.borderStrong : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : "transparent")};
  color: ${({ theme, $active, $done }) => ($active ? theme.color.accent : $done ? theme.color.text : theme.color.textMuted)};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.borderStrong)};
  }
`;

const StepMarker = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 11px;
  background: ${({ theme, $active, $done }) =>
    $done ? theme.color.accent : $active ? theme.color.accent : theme.color.surfaceRaised};
  color: ${({ theme, $active, $done }) => ($done || $active ? theme.color.onAccent : theme.color.textFaint)};
`;

const Price = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.color.accent};
`;

const TruckOption = styled.button`
  text-align: left;
  width: 100%;
  padding: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme }) => theme.color.text};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  transition: border-color 0.15s ease, background 0.15s ease;
`;

const TruckThumb = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.sm};
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
`;

const FieldGroup = styled(Stack).attrs({ $gap: 3 })`
  padding-top: ${({ theme, $first }) => ($first ? "0" : theme.space(4))};
  border-top: 1px solid ${({ theme, $first }) => ($first ? "transparent" : theme.color.border)};
`;

export const PostTrip = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  // Step 1 — route. Same LocationAutocomplete + onResolve pattern as
  // Home.jsx's search form (address-level UI backed by LocationIQ, but the
  // value that actually matters for matching is the resolved city string) —
  // previously this used the plain city-name-only CityAutocomplete, which
  // could resolve a city to a different spelling than what a shipper's
  // LocationIQ-backed search resolves it to (e.g. "Bengaluru" vs
  // "Bangalore"), silently hiding trips from search. Using the same
  // component + extraction logic on both sides keeps them consistent.
  const [fromPoint, setFromPoint] = useState({ address: "", lat: null, lng: null });
  const [toPoint, setToPoint] = useState({ address: "", lat: null, lng: null });
  const [fromCityResolved, setFromCityResolved] = useState("");
  const [toCityResolved, setToCityResolved] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [estimatedArrivalAt, setEstimatedArrivalAt] = useState("");
  const [routeErrors, setRouteErrors] = useState({});

  // Step 2 — truck
  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState("");

  // Step 3 — capacity
  const totalCapacityAmount = useUnitAmount();
  const availableCapacityAmount = useUnitAmount();
  const [pricePerTon, setPricePerTon] = useState("");
  const [pickupPoint, setPickupPoint] = useState({ address: "", lat: null, lng: null });
  const [dropPoint, setDropPoint] = useState({ address: "", lat: null, lng: null });
  const [capacityErrors, setCapacityErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    listMyTrucks()
      .then(({ trucks }) => setTrucks(trucks || []))
      .catch(() => setTrucks([]))
      .finally(() => setLoadingTrucks(false));
  }, []);

  const selectedTruck = trucks.find((t) => t._id === selectedTruckId);
  const verifiedTrucks = trucks.filter((t) => t.status === "verified");

  // Falls back to the raw typed address if no suggestion was picked (LIQ
  // down, or the user just typed a plain city name) — same fallback
  // Home.jsx's search form uses.
  const fromCity = (fromCityResolved || fromPoint.address).trim();
  const toCity = (toCityResolved || toPoint.address).trim();

  // Typing after picking a suggestion invalidates that pick's resolved
  // city — see Home.jsx's identical handlers for the full reasoning.
  const handleFromChange = (point) => {
    setFromPoint(point);
    setFromCityResolved("");
  };

  const handleToChange = (point) => {
    setToPoint(point);
    setToCityResolved("");
  };

  const goToStep = (n) => {
    if (n <= maxStep) setStep(n);
  };

  const advance = (n) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
  };

  const validateRoute = () => {
    const errors = {};
    if (!fromCity.trim()) errors.fromCity = "Enter a pickup city";
    if (!toCity.trim()) errors.toCity = "Enter a drop city";
    if (fromCity.trim() && toCity.trim() && fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      errors.toCity = "From and to city can't be the same";
    }
    if (!departureAt) errors.departureAt = "Pick a departure date & time";
    else if (new Date(departureAt) <= new Date()) errors.departureAt = "Departure must be in the future";
    if (estimatedArrivalAt && departureAt && new Date(estimatedArrivalAt) <= new Date(departureAt)) {
      errors.estimatedArrivalAt = "Arrival must be after departure";
    }
    setRouteErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCapacity = () => {
    const errors = {};
    const total = Number(totalCapacityAmount.tons);
    const avail = Number(availableCapacityAmount.tons);
    const price = Number(pricePerTon);
    if (!total || total <= 0) errors.totalCapacity = "Enter total capacity for this trip";
    else if (selectedTruck && total > selectedTruck.totalCapacity) {
      errors.totalCapacity = `Can't exceed the truck's rated capacity (${formatTons(selectedTruck.totalCapacity)})`;
    }
    if (!avail || avail <= 0) errors.availableCapacity = "Enter capacity available to sell";
    else if (total && avail > total) errors.availableCapacity = "Can't exceed total capacity";
    if (!price || price <= 0) errors.pricePerTon = "Enter a price per ton";
    if (!pickupPoint.address.trim()) errors.pickupPoint = "Pickup point is required";
    if (!dropPoint.address.trim()) errors.dropPoint = "Drop point is required";
    setCapacityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await postTrip({
        truckId: selectedTruckId,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        departureAt: new Date(departureAt).toISOString(),
        estimatedArrivalAt: estimatedArrivalAt ? new Date(estimatedArrivalAt).toISOString() : undefined,
        pickupPoint: { ...pickupPoint, address: pickupPoint.address.trim() },
        dropPoint: { ...dropPoint, address: dropPoint.address.trim() },
        totalCapacity: Number(totalCapacityAmount.tons),
        availableCapacity: Number(availableCapacityAmount.tons),
        pricePerTon: Number(pricePerTon),
      });
      toast.success(res.msg || "Trip published");
      navigate("/trips/mine");
    } catch (err) {
      setSubmitError(err.message);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const truckHint = /truck.*verified/i.test(submitError || "");
  const kycHint = /verification/i.test(submitError || "") && !truckHint;

  return (
    <PageContainer>
      <Stack $gap={5}>
        <Stack $gap={1}>
          <PageTitle>Post a trip</PageTitle>
          <Muted>
            {fromCity.trim() && toCity.trim()
              ? `${fromCity} → ${toCity} · share your spare capacity with shippers`
              : "Share your spare capacity with shippers in a few quick steps."}
          </Muted>
        </Stack>

        <StepRow $gap={2}>
          {STEPS.map((label, i) => {
            const done = i < maxStep;
            const active = i === step;
            return (
              <StepPill
                key={label}
                type="button"
                $active={active}
                $done={done}
                onClick={() => goToStep(i)}
                disabled={i > maxStep}
              >
                <StepMarker $active={active} $done={done}>
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </StepMarker>
                {label}
              </StepPill>
            );
          })}
        </StepRow>

        {step === 0 && (
          <Card>
            <Stack $gap={4}>
              <SectionTitle>Route &amp; timing</SectionTitle>
              <Field label="From city" error={routeErrors.fromCity}>
                <LocationAutocomplete
                  placeholder="Pickup city or area"
                  value={fromPoint}
                  onChange={handleFromChange}
                  onResolve={setFromCityResolved}
                  showPreview={false}
                  autoFocus
                />
              </Field>
              <Field label="To city" error={routeErrors.toCity}>
                <LocationAutocomplete
                  placeholder="Drop city or area"
                  value={toPoint}
                  onChange={handleToChange}
                  onResolve={setToCityResolved}
                  showPreview={false}
                />
              </Field>
              <Field label="Departure date & time" error={routeErrors.departureAt}>
                <Input
                  type="datetime-local"
                  lang="en-GB"
                  min={toDateTimeInputValue()}
                  value={departureAt}
                  onChange={(e) => setDepartureAt(e.target.value)}
                />
              </Field>
              <Field
                label="Estimated arrival (optional)"
                error={routeErrors.estimatedArrivalAt}
                help="Leave blank if you're not sure yet"
              >
                <Input
                  type="datetime-local"
                  lang="en-GB"
                  value={estimatedArrivalAt}
                  onChange={(e) => setEstimatedArrivalAt(e.target.value)}
                />
              </Field>
              <Button
                $fullWidth
                onClick={() => {
                  if (validateRoute()) advance(1);
                }}
              >
                Next: choose truck
              </Button>
            </Stack>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <Stack $gap={4}>
              <SectionTitle>Choose a truck</SectionTitle>
              {loadingTrucks ? (
                <Row $gap={2}>
                  <Spinner />
                  <Muted>Loading your trucks…</Muted>
                </Row>
              ) : trucks.length === 0 ? (
                <EmptyState>
                  <Stack $gap={3}>
                    <p>You haven't registered a truck yet.</p>
                    <Button as={Link} to="/trucks" $size="sm">
                      Register a truck
                    </Button>
                  </Stack>
                </EmptyState>
              ) : verifiedTrucks.length === 0 ? (
                <EmptyState>
                  <Stack $gap={3}>
                    <p>None of your trucks are verified yet. A trip can only go live once its truck is verified.</p>
                    <Button as={Link} to="/trucks" $size="sm">
                      Manage my trucks
                    </Button>
                  </Stack>
                </EmptyState>
              ) : (
                <Stack $gap={3}>
                  {trucks.map((truck) => {
                    const disabled = truck.status !== "verified";
                    return (
                      <TruckOption
                        key={truck._id}
                        type="button"
                        $active={selectedTruckId === truck._id}
                        $disabled={disabled}
                        disabled={disabled}
                        onClick={() => setSelectedTruckId(truck._id)}
                      >
                        <CardRow>
                          <Row $gap={3}>
                            <TruckThumb>
                              <TruckIcon size={19} strokeWidth={2} />
                            </TruckThumb>
                            <Stack $gap={1}>
                              <strong>{truck.regNumber}</strong>
                              <Muted>
                                {truck.truckType} · {formatTons(truck.totalCapacity)} capacity
                              </Muted>
                            </Stack>
                          </Row>
                          <StatusBadge status={truck.status} />
                        </CardRow>
                      </TruckOption>
                    );
                  })}
                </Stack>
              )}
              <Row $gap={3}>
                <Button $variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  $fullWidth
                  disabled={!selectedTruckId}
                  onClick={() => selectedTruckId && advance(2)}
                >
                  Next: capacity
                </Button>
              </Row>
            </Stack>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <Stack $gap={5}>
              <SectionTitle>Capacity &amp; price</SectionTitle>

              <FieldGroup $first>
                <SubHeading>Capacity</SubHeading>
                <Field
                  label="Total capacity on this trip"
                  error={capacityErrors.totalCapacity}
                  help={selectedTruck ? `Truck rated for ${formatTons(selectedTruck.totalCapacity)}` : undefined}
                >
                  <UnitAmountInput
                    value={totalCapacityAmount.displayValue}
                    unit={totalCapacityAmount.unit}
                    onValueChange={totalCapacityAmount.onValueChange}
                    onUnitChange={totalCapacityAmount.onUnitChange}
                    minTons={0.1}
                    maxTons={selectedTruck?.totalCapacity}
                  />
                </Field>
                <Field
                  label="Capacity available to sell"
                  error={capacityErrors.availableCapacity}
                  help="Can be less than total if you're keeping some for yourself"
                >
                  <UnitAmountInput
                    value={availableCapacityAmount.displayValue}
                    unit={availableCapacityAmount.unit}
                    onValueChange={availableCapacityAmount.onValueChange}
                    onUnitChange={availableCapacityAmount.onUnitChange}
                    minTons={0.1}
                    maxTons={totalCapacityAmount.tons || undefined}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <SubHeading>Price</SubHeading>
                <Field label="Price per ton (INR)" error={capacityErrors.pricePerTon}>
                  <Input type="number" min="1" step="1" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <SubHeading>Pickup &amp; drop points</SubHeading>
                <Field label="Pickup point" error={capacityErrors.pickupPoint}>
                  <LocationAutocomplete
                    placeholder="e.g. Hadapsar warehouse, near ring road"
                    value={pickupPoint}
                    onChange={setPickupPoint}
                  />
                </Field>
                <Field label="Drop point" error={capacityErrors.dropPoint}>
                  <LocationAutocomplete
                    placeholder="e.g. APMC yard, Nashik"
                    value={dropPoint}
                    onChange={setDropPoint}
                  />
                </Field>
              </FieldGroup>

              <Row $gap={3}>
                <Button $variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  $fullWidth
                  onClick={() => {
                    if (validateCapacity()) advance(3);
                  }}
                >
                  Next: review
                </Button>
              </Row>
            </Stack>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <Stack $gap={4}>
              <SectionTitle>Review &amp; publish</SectionTitle>
              <Stack $gap={2}>
                <CardRow>
                  <Muted>Route</Muted>
                  <strong>
                    {fromCity} → {toCity}
                  </strong>
                </CardRow>
                <CardRow>
                  <Muted>Departs</Muted>
                  <span>{departureAt && new Date(departureAt).toLocaleString("en-IN")}</span>
                </CardRow>
                {estimatedArrivalAt && (
                  <CardRow>
                    <Muted>Est. arrival</Muted>
                    <span>{new Date(estimatedArrivalAt).toLocaleString("en-IN")}</span>
                  </CardRow>
                )}
                <CardRow>
                  <Muted>Truck</Muted>
                  <span>
                    {selectedTruck?.regNumber} · {selectedTruck?.truckType}
                  </span>
                </CardRow>
                <CardRow>
                  <Muted>Capacity</Muted>
                  <span>
                    {formatTons(availableCapacityAmount.tons)} available of {formatTons(totalCapacityAmount.tons)}
                  </span>
                </CardRow>
                <CardRow>
                  <Muted>Price</Muted>
                  <Price>{formatINR(pricePerTon)} / ton</Price>
                </CardRow>
                <CardRow>
                  <Muted>Pickup</Muted>
                  <span>{pickupPoint.address}</span>
                </CardRow>
                <CardRow>
                  <Muted>Drop</Muted>
                  <span>{dropPoint.address}</span>
                </CardRow>
              </Stack>

              {submitError && (
                <EmptyState>
                  <Stack $gap={3}>
                    <p>{submitError}</p>
                    {truckHint && (
                      <Button as={Link} to="/trucks" $size="sm">
                        Go to my trucks
                      </Button>
                    )}
                    {kycHint && (
                      <Button as={Link} to="/profile" $size="sm">
                        Complete verification
                      </Button>
                    )}
                  </Stack>
                </EmptyState>
              )}

              <Row $gap={3}>
                <Button $variant="ghost" onClick={() => setStep(2)} disabled={submitting}>
                  Back
                </Button>
                <Button $fullWidth onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Publishing…" : "Publish trip"}
                </Button>
              </Row>
            </Stack>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
};

export default PostTrip;
