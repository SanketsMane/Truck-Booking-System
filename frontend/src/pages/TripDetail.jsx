import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Truck, ShieldCheck, Clock3 } from "lucide-react";
import { getTrip } from "../api/trips";
import { createBooking } from "../api/bookings";
import { BASE_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import ReviewList from "../components/ReviewList";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Field, Textarea } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { Spinner } from "../components/ui/Spinner";
import { formatDate, formatDateTime, formatINR, formatTons, normalizePoint } from "../utils/format";
import { useUnitAmount } from "../hooks/useUnitAmount";

const HeroPhoto = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 7;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.accentSoft} 0%,
    ${({ theme }) => theme.color.surfaceRaised} 100%
  );
`;

const HeroPhotoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const HeroPhotoFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.accentStrong};
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(4)};
  flex-wrap: wrap;
`;

const PriceTag = styled.div`
  text-align: right;
  flex-shrink: 0;
`;

const PriceValue = styled.div`
  font-size: 1.6rem;
  font-weight: 800;
  color: ${({ theme }) => theme.color.accent};
  line-height: 1.2;
`;

const CapacityBarTrack = styled.div`
  height: 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surfaceRaised};
  overflow: hidden;
`;

const CapacityBarFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.color.accent};
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
`;

const RouteTimeline = styled.div`
  display: flex;
  flex-direction: column;
`;

const TimelineRow = styled.div`
  display: flex;
  gap: 14px;
`;

const TimelineMarker = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 4px;
`;

const TimelineDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $variant }) => ($variant === "drop" ? theme.color.text : theme.color.accent)};
`;

const TimelineLine = styled.div`
  width: 2px;
  flex: 1;
  min-height: 26px;
  background: ${({ theme }) => theme.color.border};
  margin: 4px 0;
`;

const TimelineContent = styled.div`
  padding-bottom: ${({ theme }) => theme.space(4)};
  flex: 1;
  min-width: 0;
`;

// Departure/ETA called out in the route timeline itself — previously only
// a plain Muted line in the page header, easy to miss next to the truck
// type/reg-number line right below it. A shipper deciding between trips
// needs arrival time to actually be visible, not just present in the data.
const TimelineTime = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-weight: 700;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.accentStrong};

  svg {
    flex-shrink: 0;
  }
`;

const StatusNotice = {
  full: "This trip is fully booked — no spare capacity left.",
  cancelled: "This trip was cancelled by the transporter.",
  completed: "This trip has already been completed.",
  ongoing: "This trip is already on the road and no longer accepting bookings.",
  draft: "This trip isn't published yet.",
};

export const TripDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  // Pre-filled from the capacity entered on the home page's search form,
  // carried through the search results link (?capacity=, always in tons)
  // — still fully editable, in either tons or kg.
  const capacityAmount = useUnitAmount(searchParams.get("capacity") || "");
  const [goodsDescription, setGoodsDescription] = useState("");
  const [handlingNotes, setHandlingNotes] = useState("");
  const [pickupPoint, setPickupPoint] = useState({ address: "", lat: null, lng: null });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTrip(id)
      .then(({ trip }) => {
        if (cancelled) return;
        setTrip(trip);
        setPickupPoint(normalizePoint(trip.pickupPoint));
      })
      .catch(() => {
        if (!cancelled) setTrip(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwnTrip = user && trip && String(trip.transporter?._id) === String(user.id);
  const canBook = trip && trip.status === "published" && trip.availableCapacity > 0;

  const estimatedPrice = useMemo(() => {
    const tons = Number(capacityAmount.tons);
    if (!trip || !tons || Number.isNaN(tons)) return 0;
    return tons * trip.pricePerTon;
  }, [capacityAmount.tons, trip]);

  const handleBookClick = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/trips/${id}` } } });
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tons = Number(capacityAmount.tons);
    const nextErrors = {};
    if (!tons || tons <= 0) nextErrors.capacityRequested = "Enter how much capacity you need";
    else if (tons > trip.availableCapacity) {
      nextErrors.capacityRequested = `Only ${formatTons(trip.availableCapacity)} available`;
    }
    if (!goodsDescription.trim()) nextErrors.goodsDescription = "Describe what you're shipping";
    if (!pickupPoint.address.trim()) nextErrors.pickupPoint = "Pickup point is required";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const res = await createBooking({
        tripId: id,
        capacityRequested: tons,
        goodsDescription: goodsDescription.trim(),
        handlingNotes: handlingNotes.trim() || undefined,
        pickupPoint: { ...pickupPoint, address: pickupPoint.address.trim() },
      });
      toast.success(res.msg || "Booking request sent");
      navigate(`/bookings/${res.booking._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Row $gap={2}>
          <Spinner />
          <Muted>Loading trip…</Muted>
        </Row>
      </PageContainer>
    );
  }

  if (!trip) {
    return (
      <PageContainer>
        <EmptyState>Trip not found — it may have been removed.</EmptyState>
      </PageContainer>
    );
  }

  const capacityPct = trip.totalCapacity
    ? Math.min(100, Math.round((trip.availableCapacity / trip.totalCapacity) * 100))
    : 0;

  return (
    <PageContainer>
      <Stack $gap={5}>
        <HeroPhoto>
          {trip.truck?.photos?.[0]?.url ? (
            <HeroPhotoImg src={`${BASE_URL}${trip.truck.photos[0].url}`} alt={trip.truck?.regNumber || "Truck"} />
          ) : (
            <HeroPhotoFallback>
              <Truck size={40} strokeWidth={1.8} />
            </HeroPhotoFallback>
          )}
        </HeroPhoto>

        <Stack $gap={2}>
          <HeaderTop>
            <Stack $gap={2}>
              <Row $gap={3} $wrap>
                <PageTitle>
                  {trip.fromCity} → {trip.toCity}
                </PageTitle>
                <StatusBadge status={trip.status} />
              </Row>
              <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>
              <Muted>
                {trip.truck?.truckType}
                {trip.truck?.bodyType ? ` · ${trip.truck.bodyType}` : ""}
                {trip.truck?.regNumber ? ` · ${trip.truck.regNumber}` : ""}
              </Muted>
            </Stack>
            <PriceTag>
              <PriceValue>{formatINR(trip.pricePerTon)}</PriceValue>
              <Muted>per ton</Muted>
            </PriceTag>
          </HeaderTop>
        </Stack>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Capacity</SectionTitle>
            <Stack $gap={2}>
              <CardRow>
                <Muted>Available capacity</Muted>
                <strong>
                  {formatTons(trip.availableCapacity)} / {formatTons(trip.totalCapacity)}
                </strong>
              </CardRow>
              <CapacityBarTrack>
                <CapacityBarFill $pct={capacityPct} />
              </CapacityBarTrack>
            </Stack>
          </Stack>
        </Card>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Route</SectionTitle>
            <RouteTimeline>
              <TimelineRow>
                <TimelineMarker>
                  <TimelineDot $variant="pickup" />
                  <TimelineLine />
                </TimelineMarker>
                <TimelineContent>
                  <Muted>Pickup point</Muted>
                  <div>{normalizePoint(trip.pickupPoint).address}</div>
                  <TimelineTime>
                    <Clock3 size={13} strokeWidth={2.4} />
                    Departs {formatDateTime(trip.departureAt)}
                  </TimelineTime>
                </TimelineContent>
              </TimelineRow>
              <TimelineRow>
                <TimelineMarker>
                  <TimelineDot $variant="drop" />
                </TimelineMarker>
                <TimelineContent style={{ paddingBottom: 0 }}>
                  <Muted>Drop point</Muted>
                  <div>{normalizePoint(trip.dropPoint).address}</div>
                  {trip.estimatedArrivalAt && (
                    <TimelineTime>
                      <Clock3 size={13} strokeWidth={2.4} />
                      Est. arrival {formatDateTime(trip.estimatedArrivalAt)}
                    </TimelineTime>
                  )}
                </TimelineContent>
              </TimelineRow>
            </RouteTimeline>
          </Stack>
        </Card>

        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <SectionTitle style={{ marginBottom: 14 }}>Transporter</SectionTitle>
            {/* A trip only ever reaches this page once it's published, and
                publishing is gated on the transporter's KYC being verified
                (SRS-03.3) — so any transporter shown here is, by that
                system-enforced invariant, always verified. No extra
                verification lookup needed to show this badge honestly. */}
            <StatusBadge status="verified">
              <ShieldCheck size={12} strokeWidth={2.4} style={{ marginRight: 4, verticalAlign: -2 }} />
              Verified
            </StatusBadge>
          </Row>
          <Row $gap={3}>
            <Avatar name={trip.transporter?.name} />
            <Stack $gap={1}>
              <div style={{ fontWeight: 700 }}>{trip.transporter?.name || "—"}</div>
              <Muted>
                {trip.transporter?.city ? `${trip.transporter.city} · ` : ""}
                {trip.transporter?.ratingCount
                  ? `★ ${Number(trip.transporter.ratingAvg).toFixed(1)} (${trip.transporter.ratingCount} ratings)`
                  : "No ratings yet"}
              </Muted>
              {trip.transporter?.createdAt && (
                <Muted>
                  On {platformName} since {formatDate(trip.transporter.createdAt)}
                </Muted>
              )}
            </Stack>
          </Row>
        </Card>

        {trip.transporter?._id && <ReviewList userId={trip.transporter._id} title="Reviews for this transporter" />}

        {isOwnTrip ? (
          <EmptyState>This is your own trip — view it from My Trips to manage bookings.</EmptyState>
        ) : canBook ? (
          !showForm ? (
            <Button $size="lg" $fullWidth onClick={handleBookClick}>
              Book this capacity
            </Button>
          ) : (
            <Card>
              <form onSubmit={handleSubmit}>
                <Stack $gap={4}>
                  <SectionTitle>Request to book</SectionTitle>

                  <Field
                    label="Capacity needed"
                    error={formErrors.capacityRequested}
                    help={`Up to ${formatTons(trip.availableCapacity)} available`}
                  >
                    <UnitAmountInput
                      value={capacityAmount.displayValue}
                      unit={capacityAmount.unit}
                      onValueChange={capacityAmount.onValueChange}
                      onUnitChange={capacityAmount.onUnitChange}
                      minTons={0.1}
                      maxTons={trip.availableCapacity}
                      autoFocus
                    />
                  </Field>

                  <CardRow>
                    <Muted>Estimated price</Muted>
                    <strong>{formatINR(estimatedPrice)}</strong>
                  </CardRow>

                  <Field label="What are you shipping?" error={formErrors.goodsDescription}>
                    <Textarea
                      placeholder="e.g. 5 tons of packaged cement bags"
                      value={goodsDescription}
                      onChange={(e) => setGoodsDescription(e.target.value)}
                    />
                  </Field>

                  <Field label="Handling notes (optional)" help="Fragile, needs a forklift, etc.">
                    <Textarea value={handlingNotes} onChange={(e) => setHandlingNotes(e.target.value)} />
                  </Field>

                  <Field
                    label="Pickup point"
                    error={formErrors.pickupPoint}
                    help="Defaults to the trip's pickup point — change it if you need a different spot"
                  >
                    <LocationAutocomplete value={pickupPoint} onChange={setPickupPoint} />
                  </Field>

                  <Row $gap={3}>
                    <Button type="submit" $fullWidth disabled={submitting}>
                      {submitting ? "Sending…" : "Send booking request"}
                    </Button>
                    <Button type="button" $variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </Row>
                </Stack>
              </form>
            </Card>
          )
        ) : (
          <EmptyState>{StatusNotice[trip.status] || "This trip isn't accepting bookings right now."}</EmptyState>
        )}
      </Stack>
    </PageContainer>
  );
};

export default TripDetail;
