import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { getTrip, editTrip, cancelTrip } from "../api/trips";
import { listMyBookings, acceptBooking, rejectBooking } from "../api/bookings";
import { useLocationBroadcaster } from "../hooks/useLocationBroadcaster";
import LiveTruckMap from "../components/LiveTruckMap";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Field, Input, ErrorText } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { Spinner } from "../components/ui/Spinner";
import { formatDateTime, formatINR, formatTons, toDateTimeInputValue, normalizePoint } from "../utils/format";

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

const Price = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.color.accent};
`;

const EDITABLE_STATUSES = ["published", "full"];

export const ManageTrip = () => {
  const { id } = useParams();
  const { isSharing, start, stop, error: locationError } = useLocationBroadcaster(id);

  const [trip, setTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [departureAt, setDepartureAt] = useState("");
  const [estimatedArrivalAt, setEstimatedArrivalAt] = useState("");
  const [pickupPoint, setPickupPoint] = useState({ address: "", lat: null, lng: null });
  const [dropPoint, setDropPoint] = useState({ address: "", lat: null, lng: null });
  const [totalCapacity, setTotalCapacity] = useState("");
  const [pricePerTon, setPricePerTon] = useState("");
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const loadTrip = (cancelled) =>
    getTrip(id)
      .then(({ trip }) => {
        if (cancelled?.current) return;
        setTrip(trip);
        setDepartureAt(toDateTimeInputValue(trip.departureAt));
        setEstimatedArrivalAt(trip.estimatedArrivalAt ? toDateTimeInputValue(trip.estimatedArrivalAt) : "");
        setPickupPoint(normalizePoint(trip.pickupPoint));
        setDropPoint(normalizePoint(trip.dropPoint));
        setTotalCapacity(String(trip.totalCapacity));
        setPricePerTon(String(trip.pricePerTon));
      })
      .catch((error) => {
        if (cancelled?.current) return;
        setTrip(null);
        toast.error(error.message || "Couldn't load this trip — check your connection and try again");
      })
      .finally(() => {
        if (!cancelled?.current) setLoadingTrip(false);
      });

  const loadBookings = (cancelled) =>
    listMyBookings({ role: "transporter", tripId: id })
      .then(({ bookings }) => {
        if (!cancelled?.current) setBookings(bookings || []);
      })
      .catch((error) => {
        if (cancelled?.current) return;
        setBookings([]);
        toast.error(error.message || "Couldn't load bookings for this trip");
      })
      .finally(() => {
        if (!cancelled?.current) setLoadingBookings(false);
      });

  useEffect(() => {
    const cancelled = { current: false };
    // Reset to loading on every id change (not just first mount) — this
    // component instance is reused when navigating from managing one trip
    // straight to another, so without this the previous trip's data would
    // stay on screen while the new one loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingTrip(true);
    setLoadingBookings(true);
    loadTrip(cancelled);
    loadBookings(cancelled);
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const bookedCapacity = trip ? trip.totalCapacity - trip.availableCapacity : 0;

  const validateEdit = () => {
    const errors = {};
    const total = Number(totalCapacity);
    const price = Number(pricePerTon);
    if (!total || total <= 0) errors.totalCapacity = "Enter a total capacity";
    else if (total < bookedCapacity) {
      errors.totalCapacity = `Can't go below the ${formatTons(bookedCapacity)} already booked`;
    }
    if (!price || price <= 0) errors.pricePerTon = "Enter a price per ton";
    if (!pickupPoint.address.trim()) errors.pickupPoint = "Pickup point is required";
    if (!dropPoint.address.trim()) errors.dropPoint = "Drop point is required";
    if (!departureAt) errors.departureAt = "Pick a departure date & time";
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEdit()) return;

    const updates = {};
    if (Number(totalCapacity) !== trip.totalCapacity) updates.totalCapacity = Number(totalCapacity);
    if (Number(pricePerTon) !== trip.pricePerTon) updates.pricePerTon = Number(pricePerTon);
    if (pickupPoint.address.trim() !== normalizePoint(trip.pickupPoint).address) {
      updates.pickupPoint = { ...pickupPoint, address: pickupPoint.address.trim() };
    }
    if (dropPoint.address.trim() !== normalizePoint(trip.dropPoint).address) {
      updates.dropPoint = { ...dropPoint, address: dropPoint.address.trim() };
    }
    if (departureAt !== toDateTimeInputValue(trip.departureAt)) {
      updates.departureAt = new Date(departureAt).toISOString();
    }
    const origArrival = trip.estimatedArrivalAt ? toDateTimeInputValue(trip.estimatedArrivalAt) : "";
    if (estimatedArrivalAt && estimatedArrivalAt !== origArrival) {
      updates.estimatedArrivalAt = new Date(estimatedArrivalAt).toISOString();
    }

    if (Object.keys(updates).length === 0) {
      setEditMode(false);
      return;
    }

    setSaving(true);
    try {
      const res = await editTrip(id, updates);
      toast.success(res.msg || "Trip updated");
      setTrip(res.trip);
      setEditMode(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTrip = async () => {
    const confirmed = window.confirm(
      "Cancel this trip? Any pending or confirmed bookings on it will also be cancelled, and shippers will be notified. This can't be undone."
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const res = await cancelTrip(id);
      toast.success(res.msg || "Trip cancelled");
      setTrip(res.trip);
      loadBookings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleAccept = async (bookingId) => {
    setActioningId(bookingId);
    try {
      const res = await acceptBooking(bookingId);
      toast.success(res.msg || "Booking confirmed");
      await Promise.all([loadTrip(), loadBookings()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (bookingId) => {
    const reason = window.prompt("Reason for rejecting this booking (optional):");
    if (reason === null) return;

    setActioningId(bookingId);
    try {
      const res = await rejectBooking(bookingId, reason || undefined);
      toast.success(res.msg || "Booking rejected");
      loadBookings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  if (loadingTrip) {
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
        <EmptyState>Trip not found.</EmptyState>
      </PageContainer>
    );
  }

  const canEdit = EDITABLE_STATUSES.includes(trip.status);
  const canCancel = !["completed", "cancelled"].includes(trip.status);
  const capacityPct = trip.totalCapacity ? Math.min(100, Math.round((bookedCapacity / trip.totalCapacity) * 100)) : 0;

  return (
    <PageContainer>
      <Stack $gap={5}>
        <Row $gap={3} $wrap style={{ justifyContent: "space-between" }}>
          <Stack $gap={1}>
            <PageTitle>
              {trip.fromCity} → {trip.toCity}
            </PageTitle>
            <Muted>Manage trip</Muted>
          </Stack>
          <StatusBadge status={trip.status} />
        </Row>

        <Card>
          {!editMode ? (
            <Stack $gap={3}>
              <CardRow>
                <Muted>Departs</Muted>
                <span>{formatDateTime(trip.departureAt)}</span>
              </CardRow>
              {trip.estimatedArrivalAt && (
                <CardRow>
                  <Muted>Est. arrival</Muted>
                  <span>{formatDateTime(trip.estimatedArrivalAt)}</span>
                </CardRow>
              )}
              <Stack $gap={2}>
                <CardRow>
                  <Muted>Capacity booked</Muted>
                  <strong>
                    {formatTons(bookedCapacity)} / {formatTons(trip.totalCapacity)}
                  </strong>
                </CardRow>
                <CapacityBarTrack>
                  <CapacityBarFill $pct={capacityPct} />
                </CapacityBarTrack>
              </Stack>
              <CardRow>
                <Muted>Price</Muted>
                <Price>{formatINR(trip.pricePerTon)} / ton</Price>
              </CardRow>
              <CardRow>
                <Muted>Pickup</Muted>
                <span>{normalizePoint(trip.pickupPoint).address}</span>
              </CardRow>
              <CardRow>
                <Muted>Drop</Muted>
                <span>{normalizePoint(trip.dropPoint).address}</span>
              </CardRow>

              <Row $gap={3} $wrap>
                {canEdit && (
                  <Button $variant="secondary" onClick={() => setEditMode(true)}>
                    Edit trip
                  </Button>
                )}
                {canCancel && (
                  <Button $variant="danger" onClick={handleCancelTrip} disabled={cancelling}>
                    {cancelling ? "Cancelling…" : "Cancel trip"}
                  </Button>
                )}
              </Row>
              {!canEdit && <Muted>This trip can't be edited while it's {trip.status}.</Muted>}
            </Stack>
          ) : (
            <Stack $gap={4}>
              <SectionTitle>Edit trip</SectionTitle>
              <Field label="Departure date & time" error={editErrors.departureAt}>
                <Input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} />
              </Field>
              <Field label="Estimated arrival (optional)">
                <Input
                  type="datetime-local"
                  value={estimatedArrivalAt}
                  onChange={(e) => setEstimatedArrivalAt(e.target.value)}
                />
              </Field>
              <Field
                label="Total capacity (tons)"
                error={editErrors.totalCapacity}
                help={`${formatTons(bookedCapacity)} already booked`}
              >
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={totalCapacity}
                  onChange={(e) => setTotalCapacity(e.target.value)}
                />
              </Field>
              <Field label="Price per ton (INR)" error={editErrors.pricePerTon}>
                <Input type="number" min="1" step="1" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} />
              </Field>
              <Field label="Pickup point" error={editErrors.pickupPoint}>
                <LocationAutocomplete value={pickupPoint} onChange={setPickupPoint} />
              </Field>
              <Field label="Drop point" error={editErrors.dropPoint}>
                <LocationAutocomplete value={dropPoint} onChange={setDropPoint} />
              </Field>

              <Row $gap={3}>
                <Button $fullWidth onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button $variant="ghost" onClick={() => setEditMode(false)} disabled={saving}>
                  Cancel
                </Button>
              </Row>
            </Stack>
          )}
        </Card>

        {bookings.some((b) => b.status === "ongoing") && (
          <Card>
            <Stack $gap={3}>
              <CardRow>
                <Stack $gap={1}>
                  <SectionTitle>Share live location</SectionTitle>
                  <Muted>
                    Shippers on this trip can see the truck move on a map while you're sharing. Keep this tab open
                    and your phone charged — it only tracks while the page is open.
                  </Muted>
                </Stack>
                <Button
                  $variant={isSharing ? "danger" : "primary"}
                  onClick={isSharing ? stop : start}
                  $size="sm"
                >
                  {isSharing ? "Stop sharing" : "Start sharing"}
                </Button>
              </CardRow>
              {locationError && <ErrorText>{locationError}</ErrorText>}
              {isSharing && <LiveTruckMap tripId={id} />}
            </Stack>
          </Card>
        )}

        <Stack $gap={3}>
          <SectionTitle>Bookings</SectionTitle>
          {loadingBookings ? (
            <Row $gap={2}>
              <Spinner />
              <Muted>Loading bookings…</Muted>
            </Row>
          ) : bookings.length === 0 ? (
            <EmptyState>No booking requests on this trip yet.</EmptyState>
          ) : (
            <Stack $gap={3}>
              {bookings.map((booking) => (
                <Card key={booking._id}>
                  <Stack $gap={3}>
                    <CardRow>
                      <Row $gap={3}>
                        <Avatar name={booking.shipper?.name} size={38} />
                        <Stack $gap={1}>
                          <strong>{booking.shipper?.name || "Shipper"}</strong>
                          <Muted>
                            {booking.shipper?.city ? `${booking.shipper.city} · ` : ""}
                            {booking.shipper?.ratingAvg
                              ? `★ ${Number(booking.shipper.ratingAvg).toFixed(1)}`
                              : "No ratings yet"}
                          </Muted>
                        </Stack>
                      </Row>
                      <StatusBadge status={booking.status} />
                    </CardRow>

                    <Row $gap={4} $wrap>
                      <Muted>{formatTons(booking.capacityRequested)} requested</Muted>
                      <Price>{formatINR(booking.priceEstimate)}</Price>
                    </Row>

                    <Muted>{booking.goodsDescription}</Muted>

                    <Row $gap={3} $wrap>
                      {booking.status === "pending" && (
                        <>
                          <Button
                            $size="sm"
                            onClick={() => handleAccept(booking._id)}
                            disabled={actioningId === booking._id}
                          >
                            {actioningId === booking._id ? "Working…" : "Accept"}
                          </Button>
                          <Button
                            $size="sm"
                            $variant="danger"
                            onClick={() => handleReject(booking._id)}
                            disabled={actioningId === booking._id}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button as={Link} to={`/bookings/${booking._id}`} $size="sm" $variant="ghost">
                        View details
                      </Button>
                    </Row>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default ManageTrip;
