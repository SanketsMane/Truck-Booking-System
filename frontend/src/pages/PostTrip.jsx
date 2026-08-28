import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Check, ShieldAlert, Truck as TruckIcon, X } from "lucide-react";
import { postTrip } from "../api/trips";
import { listMyTrucks } from "../api/trucks";
import { getMyVerifications } from "../api/verification";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, SubHeading, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { TripStopsField, cleanStops } from "../components/ui/TripStopsField";
import { TimeInput } from "../components/ui/TimeInput";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { Spinner } from "../components/ui/Spinner";
import {
  formatINR,
  formatTons,
  toDateInputValue,
  buildDepartureAt,
  buildEstimatedArrivalAt,
  DEFAULT_DEPARTURE_TIME,
  DEFAULT_ARRIVAL_TIME,
} from "../utils/format";
import { useUnitAmount } from "../hooks/useUnitAmount";

const STEPS = ["Route", "Truck", "Capacity", "Review"];

// Kept in step with tripController.postTrip's two checks. A truck still in
// review can't carry a trip yet, and a retired one is history rather than
// fleet — everything else the transporter owns is fair game.
const isUsableTruck = (truck) => truck.status === "verified" && truck.lifecycle !== "inactive";

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

// Shown on every step (not just Review) — the whole point is finding out
// before investing time filling in Route/Truck/Capacity, not just before
// the final Publish click. Doesn't block the form itself — tripController.
// postTrip is what actually, unconditionally enforces this — it just sets
// honest expectations up front instead of letting the transporter discover
// this for the first time from a failed POST at the very end.
const VerificationNotice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.warning};
  background: ${({ theme }) => theme.color.warningSoft};

  svg:first-child {
    flex-shrink: 0;
    color: ${({ theme }) => theme.color.warning};
    margin-top: 1px;
  }

  strong {
    display: block;
    margin-bottom: 2px;
    font-size: 14px;
    color: ${({ theme }) => theme.color.text};
  }

  p {
    margin: 0;
    font-size: 13px;
    color: ${({ theme }) => theme.color.textMuted};
  }
`;

const DraftNotice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: 10px ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surfaceRaised};
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const DraftDismiss = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textMuted};

  &:hover {
    color: ${({ theme }) => theme.color.danger};
  }
`;

// Session-only (not localStorage) — a draft that outlives the tab is more
// surprising than helpful (stale trucks/prices creeping back weeks later).
// This only needs to survive the specific "got sent to /profile or /trucks
// mid-wizard and came back" round trip the reported bug is about.
const DRAFT_KEY = "posttrip-draft-v1";

const loadDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // sessionStorage unavailable (private browsing, quota) — draft
    // persistence is a nice-to-have, not required for the form to work.
  }
};

export const PostTrip = () => {
  const navigate = useNavigate();
  // Read once, at mount — every field below seeds itself from this instead
  // of a hardcoded empty default, which is what makes a wizard abandoned
  // partway through (e.g. sent off to /profile or /trucks to fix
  // verification) come back exactly as it was left. No setter: clearing the
  // draft (handleStartOver) does a full page reload, which recomputes this
  // from a now-empty sessionStorage — never needs to update in place.
  const [draft] = useState(loadDraft);
  const [step, setStep] = useState(draft?.step ?? 0);
  const [maxStep, setMaxStep] = useState(draft?.maxStep ?? 0);

  // Step 1 — route. Same LocationAutocomplete + onResolve pattern as
  // Home.jsx's search form (address-level UI backed by LocationIQ, but the
  // value that actually matters for matching is the resolved city string) —
  // previously this used the plain city-name-only CityAutocomplete, which
  // could resolve a city to a different spelling than what a shipper's
  // LocationIQ-backed search resolves it to (e.g. "Bengaluru" vs
  // "Bangalore"), silently hiding trips from search. Using the same
  // component + extraction logic on both sides keeps them consistent.
  const [fromPoint, setFromPoint] = useState(draft?.fromPoint ?? { address: "", lat: null, lng: null });
  const [toPoint, setToPoint] = useState(draft?.toPoint ?? { address: "", lat: null, lng: null });
  const [fromCityResolved, setFromCityResolved] = useState(draft?.fromCityResolved ?? "");
  const [toCityResolved, setToCityResolved] = useState(draft?.toCityResolved ?? "");
  const [departureAt, setDepartureAt] = useState(draft?.departureAt ?? "");
  const [departureTime, setDepartureTime] = useState(draft?.departureTime ?? DEFAULT_DEPARTURE_TIME);
  const [estimatedArrivalAt, setEstimatedArrivalAt] = useState(draft?.estimatedArrivalAt ?? "");
  const [arrivalTime, setArrivalTime] = useState(draft?.arrivalTime ?? DEFAULT_ARRIVAL_TIME);
  const [routeErrors, setRouteErrors] = useState({});

  // Step 2 — truck
  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState(draft?.selectedTruckId ?? "");

  // Step 3 — capacity
  const totalCapacityAmount = useUnitAmount(draft?.totalCapacityTons ?? "");
  const availableCapacityAmount = useUnitAmount(draft?.availableCapacityTons ?? "");
  const [pricePerTon, setPricePerTon] = useState(draft?.pricePerTon ?? "");
  const [pickupPoint, setPickupPoint] = useState(draft?.pickupPoint ?? { address: "", lat: null, lng: null });
  const [dropPoint, setDropPoint] = useState(draft?.dropPoint ?? { address: "", lat: null, lng: null });
  const [stops, setStops] = useState(draft?.stops ?? []);
  const [capacityErrors, setCapacityErrors] = useState({});

  // Transporter's own KYC status — fetched here (not just left to the
  // backend's final-submit rejection) so the "not verified yet" notice
  // below can show immediately on load, before any of Route/Truck/
  // Capacity has been touched. See tripController.postTrip's
  // verificationGateEnabled check for what actually enforces this;
  // nothing here blocks the form, it only sets expectations early.
  const [verifications, setVerifications] = useState([]);
  const [loadingVerification, setLoadingVerification] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    listMyTrucks()
      .then(({ trucks }) => {
        const list = trucks || [];
        setTrucks(list);
        // A transporter can now run a whole fleet, so this is a real picker.
        // Auto-select only when there's exactly one usable truck (the common
        // case) — with several, the driver has to say which one, and a
        // stale draft pointing at a truck that's since been retired is
        // cleared rather than left dangling.
        const usable = list.filter(isUsableTruck);
        setSelectedTruckId((current) => {
          if (current && usable.some((t) => t._id === current)) return current;
          return usable.length === 1 ? usable[0]._id : "";
        });
      })
      .catch(() => setTrucks([]))
      .finally(() => setLoadingTrucks(false));
  }, []);

  useEffect(() => {
    getMyVerifications()
      .then(({ verifications }) => setVerifications(verifications || []))
      .catch(() => setVerifications([]))
      .finally(() => setLoadingVerification(false));
  }, []);

  // Saves on every change, not just on unmount — a browser refresh, tab
  // close, or crash mid-flow shouldn't lose progress either, and this is
  // the only way to also cover those without adding an unload-event
  // handler that's unreliable on mobile browsers anyway.
  useEffect(() => {
    const data = {
      step,
      maxStep,
      fromPoint,
      toPoint,
      fromCityResolved,
      toCityResolved,
      departureAt,
      departureTime,
      estimatedArrivalAt,
      arrivalTime,
      selectedTruckId,
      totalCapacityTons: totalCapacityAmount.tons,
      availableCapacityTons: availableCapacityAmount.tons,
      pricePerTon,
      pickupPoint,
      dropPoint,
      stops,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // sessionStorage unavailable (private browsing, quota) — draft
      // persistence is a nice-to-have, not required for the form to work.
    }
  }, [
    step,
    maxStep,
    fromPoint,
    toPoint,
    fromCityResolved,
    toCityResolved,
    departureAt,
    departureTime,
    estimatedArrivalAt,
    arrivalTime,
    selectedTruckId,
    totalCapacityAmount.tons,
    availableCapacityAmount.tons,
    pricePerTon,
    pickupPoint,
    dropPoint,
    stops,
  ]);

  const handleStartOver = () => {
    clearDraft();
    window.location.reload();
  };

  const selectedTruck = trucks.find((t) => t._id === selectedTruckId);
  // Every truck a trip can actually be posted against — mirrors exactly what
  // tripController.postTrip accepts (verified, and not retired), so the form
  // never offers a truck the API will refuse.
  const usableTrucks = trucks.filter(isUsableTruck);
  const transporterVerification = verifications.find((v) => v.type === "transporter");
  const transporterVerified = transporterVerification?.status === "verified";

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
    // Same city is a real trip — local/intra-city delivery, not a mistake
    // to guard against (a transporter moving goods across town posts
    // Pune -> Pune with different pickup/drop points, same as any other
    // trip). No backend rule requires these to differ either.
    if (!departureAt) errors.departureAt = "Pick a departure date";
    else if (departureAt < toDateInputValue()) errors.departureAt = "Departure date can't be in the past";
    if (estimatedArrivalAt && departureAt && estimatedArrivalAt < departureAt) {
      errors.estimatedArrivalAt = "Arrival date can't be before departure";
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
      const departureAtInstant = buildDepartureAt(departureAt, departureTime);
      const arrivalAtInstant = buildEstimatedArrivalAt(estimatedArrivalAt, arrivalTime, departureAtInstant);
      const res = await postTrip({
        truckId: selectedTruckId,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        departureAt: departureAtInstant.toISOString(),
        estimatedArrivalAt: arrivalAtInstant ? arrivalAtInstant.toISOString() : undefined,
        pickupPoint: { ...pickupPoint, address: pickupPoint.address.trim() },
        dropPoint: { ...dropPoint, address: dropPoint.address.trim() },
        stops: cleanStops(stops),
        totalCapacity: Number(totalCapacityAmount.tons),
        availableCapacity: Number(availableCapacityAmount.tons),
        pricePerTon: Number(pricePerTon),
      });
      toast.success(res.msg || "Trip published");
      clearDraft();
      navigate("/trips/mine");
    } catch (err) {
      setSubmitError(err.message);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const truckHint = /active,\s*verified truck/i.test(submitError || "");
  const kycHint = /driver verification/i.test(submitError || "");

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

        {draft && (
          <DraftNotice>
            <span>Restored your in-progress trip.</span>
            <DraftDismiss type="button" onClick={handleStartOver}>
              <X size={13} strokeWidth={2.6} />
              Start over
            </DraftDismiss>
          </DraftNotice>
        )}

        {!loadingVerification && !transporterVerified && (
          <VerificationNotice>
            <ShieldAlert size={18} strokeWidth={2.2} />
            <div>
              <strong>Your transporter profile isn't verified yet.</strong>
              <p>
                You can prepare this trip below, but publishing will be blocked until verification is complete —
                your progress here is saved, so it's still here when you come back.
              </p>
            </div>
            <Button as={Link} to="/profile" $size="sm" $variant="secondary">
              Verify now
            </Button>
          </VerificationNotice>
        )}

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
              <Field label="Departure date" error={routeErrors.departureAt}>
                <Input
                  type="date"
                  lang="en-GB"
                  min={toDateInputValue()}
                  value={departureAt}
                  onChange={(e) => setDepartureAt(e.target.value)}
                />
              </Field>
              <Field label="Departure time" help="24-hour format">
                <TimeInput value={departureTime} onChange={setDepartureTime} />
              </Field>
              <Field
                label="Estimated arrival date (optional)"
                error={routeErrors.estimatedArrivalAt}
                help="Leave blank if you're not sure yet"
              >
                <Input
                  type="date"
                  lang="en-GB"
                  min={departureAt || toDateInputValue()}
                  value={estimatedArrivalAt}
                  onChange={(e) => setEstimatedArrivalAt(e.target.value)}
                />
              </Field>
              {estimatedArrivalAt && (
                <Field label="Estimated arrival time" help="24-hour format">
                  <TimeInput value={arrivalTime} onChange={setArrivalTime} />
                </Field>
              )}
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
              <SectionTitle>Your truck</SectionTitle>
              {loadingTrucks ? (
                <Row $gap={2}>
                  <Spinner />
                  <Muted>Loading your truck…</Muted>
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
              ) : usableTrucks.length === 0 ? (
                <EmptyState>
                  <Stack $gap={3}>
                    <p>None of your trucks are verified yet — a truck has to pass verification before you can post a trip on it.</p>
                    <Button as={Link} to="/trucks" $size="sm">
                      Check verification status
                    </Button>
                  </Stack>
                </EmptyState>
              ) : (
                <Stack $gap={2}>
                  {usableTrucks.map((truck) => (
                    <TruckOption
                      key={truck._id}
                      type="button"
                      $active={truck._id === selectedTruckId}
                      onClick={() => setSelectedTruckId(truck._id)}
                      aria-pressed={truck._id === selectedTruckId}
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
                  ))}
                  {usableTrucks.length > 1 && (
                    <Muted style={{ fontSize: 13 }}>Pick the truck running this trip.</Muted>
                  )}
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
                <Field
                  label="Stops along the way"
                  help="Add the towns you pass through — shippers searching any leg of your route will find you."
                >
                  <TripStopsField stops={stops} onChange={setStops} />
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
                  <span>
                    {departureAt && new Date(`${departureAt}T00:00:00`).toLocaleDateString("en-IN")} {departureTime}
                  </span>
                </CardRow>
                {estimatedArrivalAt && (
                  <CardRow>
                    <Muted>Est. arrival</Muted>
                    <span>
                      {new Date(`${estimatedArrivalAt}T00:00:00`).toLocaleDateString("en-IN")} {arrivalTime}
                    </span>
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
                {cleanStops(stops).length > 0 && (
                  <CardRow>
                    <Muted>Via</Muted>
                    <span>{cleanStops(stops).map((stop) => stop.address).join(" → ")}</span>
                  </CardRow>
                )}
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
