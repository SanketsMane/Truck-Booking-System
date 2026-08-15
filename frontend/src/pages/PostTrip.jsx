import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { postTrip } from "../api/trips";
import { listMyTrucks } from "../api/trucks";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { CityAutocomplete } from "../components/ui/CityAutocomplete";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { Spinner } from "../components/ui/Spinner";
import { formatINR, formatTons, formatCbm, toDateTimeInputValue } from "../utils/format";

const STEPS = ["Route", "Truck", "Capacity", "Review"];

const StepRow = styled(Row)`
  overflow-x: auto;
  padding-bottom: 4px;
`;

const StepPill = styled.button`
  flex: none;
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  font-weight: 700;
  border: 1px solid ${({ theme, $active }) => (($active) ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.textMuted)};
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
`;

export const PostTrip = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  // Step 1 — route
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [estimatedArrivalAt, setEstimatedArrivalAt] = useState("");
  const [routeErrors, setRouteErrors] = useState({});

  // Step 2 — truck
  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState("");

  // Step 3 — capacity
  const [totalCapacity, setTotalCapacity] = useState("");
  const [availableCapacity, setAvailableCapacity] = useState("");
  const [volumeCbm, setVolumeCbm] = useState("");
  const [availableVolumeCbm, setAvailableVolumeCbm] = useState("");
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
    const total = Number(totalCapacity);
    const avail = Number(availableCapacity);
    const price = Number(pricePerTon);
    if (!total || total <= 0) errors.totalCapacity = "Enter total capacity for this trip";
    else if (selectedTruck && total > selectedTruck.totalCapacity) {
      errors.totalCapacity = `Can't exceed the truck's rated capacity (${formatTons(selectedTruck.totalCapacity)})`;
    }
    if (!avail || avail <= 0) errors.availableCapacity = "Enter capacity available to sell";
    else if (total && avail > total) errors.availableCapacity = "Can't exceed total capacity";
    if (volumeCbm.trim() || availableVolumeCbm.trim()) {
      const vol = Number(volumeCbm);
      const availVol = Number(availableVolumeCbm);
      if (!vol || vol <= 0) errors.volumeCbm = "Enter total volume, or leave both volume fields blank";
      if (!availVol || availVol <= 0) errors.availableVolumeCbm = "Enter available volume, or leave both volume fields blank";
      else if (vol && availVol > vol) errors.availableVolumeCbm = "Can't exceed total volume";
    }
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
        totalCapacity: Number(totalCapacity),
        availableCapacity: Number(availableCapacity),
        volumeCbm: volumeCbm.trim() ? Number(volumeCbm) : undefined,
        availableVolumeCbm: volumeCbm.trim() ? Number(availableVolumeCbm) : undefined,
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
        <PageTitle>Post Your Trip</PageTitle>

        <StepRow $gap={2}>
          {STEPS.map((label, i) => (
            <StepPill key={label} type="button" $active={i === step} onClick={() => goToStep(i)} disabled={i > maxStep}>
              {i + 1}. {label}
            </StepPill>
          ))}
        </StepRow>

        {step === 0 && (
          <Card>
            <Stack $gap={4}>
              <SectionTitle>Route &amp; timing</SectionTitle>
              <Field label="From city" error={routeErrors.fromCity}>
                <CityAutocomplete value={fromCity} onChange={setFromCity} autoFocus />
              </Field>
              <Field label="To city" error={routeErrors.toCity}>
                <CityAutocomplete value={toCity} onChange={setToCity} />
              </Field>
              <Field label="Departure date & time" error={routeErrors.departureAt}>
                <Input
                  type="datetime-local"
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
                          <Stack $gap={1}>
                            <strong>{truck.regNumber}</strong>
                            <Muted>
                              {truck.truckType} · {formatTons(truck.totalCapacity)} capacity
                            </Muted>
                          </Stack>
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
            <Stack $gap={4}>
              <SectionTitle>Capacity &amp; price</SectionTitle>
              <Field
                label="Total capacity on this trip (tons)"
                error={capacityErrors.totalCapacity}
                help={selectedTruck ? `Truck rated for ${formatTons(selectedTruck.totalCapacity)}` : undefined}
              >
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={selectedTruck?.totalCapacity}
                  value={totalCapacity}
                  onChange={(e) => setTotalCapacity(e.target.value)}
                />
              </Field>
              <Field
                label="Capacity available to sell (tons)"
                error={capacityErrors.availableCapacity}
                help="Can be less than total if you're keeping some for yourself"
              >
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={totalCapacity || undefined}
                  value={availableCapacity}
                  onChange={(e) => setAvailableCapacity(e.target.value)}
                />
              </Field>
              <Field
                label="Total volume (m³, optional)"
                error={capacityErrors.volumeCbm}
                help="Optional — for bulky-but-light goods that run out of space before weight"
              >
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={volumeCbm}
                  onChange={(e) => setVolumeCbm(e.target.value)}
                />
              </Field>
              <Field
                label="Volume available to sell (m³, optional)"
                error={capacityErrors.availableVolumeCbm}
                help="Leave both volume fields blank if you don't want to track volume for this trip"
              >
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={volumeCbm || undefined}
                  value={availableVolumeCbm}
                  onChange={(e) => setAvailableVolumeCbm(e.target.value)}
                />
              </Field>
              <Field label="Price per ton (INR)" error={capacityErrors.pricePerTon}>
                <Input type="number" min="1" step="1" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} />
              </Field>
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
                    {formatTons(availableCapacity)} available of {formatTons(totalCapacity)}
                  </span>
                </CardRow>
                {volumeCbm.trim() && (
                  <CardRow>
                    <Muted>Volume</Muted>
                    <span>
                      {formatCbm(availableVolumeCbm)} available of {formatCbm(volumeCbm)}
                    </span>
                  </CardRow>
                )}
                <CardRow>
                  <Muted>Price</Muted>
                  <span>{formatINR(pricePerTon)} / ton</span>
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
