import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { getTrip } from "../api/trips";
import { createBooking } from "../api/bookings";
import { BASE_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReviewList from "../components/ReviewList";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Form";
import { Spinner } from "../components/ui/Spinner";
import { formatDateTime, formatINR, formatTons, formatCbm } from "../utils/format";

const PhotoFrame = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const TruckPhoto = styled.img`
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;

  ${PhotoFrame}:hover & {
    transform: scale(1.04);
  }
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
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [capacityRequested, setCapacityRequested] = useState("");
  const [volumeRequested, setVolumeRequested] = useState("");
  const [goodsDescription, setGoodsDescription] = useState("");
  const [handlingNotes, setHandlingNotes] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTrip(id)
      .then(({ trip }) => {
        if (cancelled) return;
        setTrip(trip);
        setPickupPoint(trip.pickupPoint);
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
    const tons = Number(capacityRequested);
    if (!trip || !tons || Number.isNaN(tons)) return 0;
    return tons * trip.pricePerTon;
  }, [capacityRequested, trip]);

  const handleBookClick = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/trips/${id}` } } });
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tons = Number(capacityRequested);
    const nextErrors = {};
    if (!tons || tons <= 0) nextErrors.capacityRequested = "Enter how many tons you need";
    else if (tons > trip.availableCapacity) {
      nextErrors.capacityRequested = `Only ${formatTons(trip.availableCapacity)} available`;
    }
    if (trip.volumeCbm != null && volumeRequested) {
      const cbm = Number(volumeRequested);
      if (cbm > trip.availableVolumeCbm) {
        nextErrors.volumeRequested = `Only ${formatCbm(trip.availableVolumeCbm)} available`;
      }
    }
    if (!goodsDescription.trim()) nextErrors.goodsDescription = "Describe what you're shipping";
    if (!pickupPoint.trim()) nextErrors.pickupPoint = "Pickup point is required";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const res = await createBooking({
        tripId: id,
        capacityRequested: tons,
        volumeRequested: trip.volumeCbm != null && volumeRequested ? Number(volumeRequested) : undefined,
        goodsDescription: goodsDescription.trim(),
        handlingNotes: handlingNotes.trim() || undefined,
        pickupPoint: pickupPoint.trim(),
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
        <Stack $gap={2}>
          <Row $gap={3} $wrap>
            <PageTitle>
              {trip.fromCity} → {trip.toCity}
            </PageTitle>
            <StatusBadge status={trip.status} />
          </Row>
          <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>
          {trip.estimatedArrivalAt && <Muted>Est. arrival {formatDateTime(trip.estimatedArrivalAt)}</Muted>}
        </Stack>

        <Card>
          <Stack $gap={4}>
            <SectionTitle>Truck &amp; capacity</SectionTitle>
            {trip.truck?.photos?.[0]?.url && (
              <PhotoFrame>
                <TruckPhoto src={`${BASE_URL}${trip.truck.photos[0].url}`} alt={trip.truck?.regNumber || "Truck"} />
              </PhotoFrame>
            )}
            <Row $gap={4} $wrap>
              <Muted>
                {trip.truck?.truckType}
                {trip.truck?.bodyType ? ` · ${trip.truck.bodyType}` : ""}
              </Muted>
              {trip.truck?.regNumber && <Muted>{trip.truck.regNumber}</Muted>}
            </Row>
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
            {trip.volumeCbm != null && (
              <CardRow>
                <Muted>Available volume</Muted>
                <strong>
                  {formatCbm(trip.availableVolumeCbm)} / {formatCbm(trip.volumeCbm)}
                </strong>
              </CardRow>
            )}
            <CardRow>
              <Muted>Price</Muted>
              <strong>{formatINR(trip.pricePerTon)} / ton</strong>
            </CardRow>
          </Stack>
        </Card>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Route</SectionTitle>
            <CardRow>
              <Muted>Pickup point</Muted>
              <span>{trip.pickupPoint}</span>
            </CardRow>
            <CardRow>
              <Muted>Drop point</Muted>
              <span>{trip.dropPoint}</span>
            </CardRow>
          </Stack>
        </Card>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Transporter</SectionTitle>
            <CardRow>
              <Muted>Name</Muted>
              <span>{trip.transporter?.name || "—"}</span>
            </CardRow>
            {trip.transporter?.city && (
              <CardRow>
                <Muted>City</Muted>
                <span>{trip.transporter.city}</span>
              </CardRow>
            )}
            <CardRow>
              <Muted>Rating</Muted>
              <span>
                {trip.transporter?.ratingCount
                  ? `★ ${Number(trip.transporter.ratingAvg).toFixed(1)} (${trip.transporter.ratingCount} ratings)`
                  : "No ratings yet"}
              </span>
            </CardRow>
          </Stack>
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
                    label="Capacity needed (tons)"
                    error={formErrors.capacityRequested}
                    help={`Up to ${formatTons(trip.availableCapacity)} available`}
                  >
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      max={trip.availableCapacity}
                      value={capacityRequested}
                      onChange={(e) => setCapacityRequested(e.target.value)}
                      autoFocus
                    />
                  </Field>

                  <CardRow>
                    <Muted>Estimated price</Muted>
                    <strong>{formatINR(estimatedPrice)}</strong>
                  </CardRow>

                  {trip.volumeCbm != null && (
                    <Field
                      label="Volume needed (m³, optional)"
                      error={formErrors.volumeRequested}
                      help={`Up to ${formatCbm(trip.availableVolumeCbm)} available`}
                    >
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        max={trip.availableVolumeCbm}
                        value={volumeRequested}
                        onChange={(e) => setVolumeRequested(e.target.value)}
                      />
                    </Field>
                  )}

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

                  <Field label="Pickup point" error={formErrors.pickupPoint}>
                    <Input value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} />
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
