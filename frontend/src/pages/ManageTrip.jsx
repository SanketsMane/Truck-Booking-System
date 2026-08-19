import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { getTrip, editTrip, cancelTrip } from "../api/trips";
import { listMyBookings, acceptBooking, rejectBooking } from "../api/bookings";
import { PageContainer, Stack, Row, PageTitle, SectionTitle, SubHeading, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { Spinner } from "../components/ui/Spinner";
import { formatDateTime, formatINR, formatTons, toDateTimeInputValue, normalizePoint } from "../utils/format";
import { useUnitAmount } from "../hooks/useUnitAmount";

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

// Same route-timeline treatment as TripDetail (the shipper-facing view of
// this same trip) — kept as its own local copy rather than a shared import
// since neither page exports these, matching how CapacityBarTrack/Fill are
// already duplicated per-page in this codebase.
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

const Price = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.color.accent};
`;

// Groups related edit fields under a small heading with a top divider —
// same treatment as PostTrip's capacity step, so editing a trip here reads
// like a continuation of posting it there.
const FieldGroup = styled(Stack).attrs({ $gap: 3 })`
  padding-top: ${({ theme, $first }) => ($first ? "0" : theme.space(4))};
  border-top: 1px solid ${({ theme, $first }) => ($first ? "transparent" : theme.color.border)};
`;

// A pending booking needs a decision from the transporter — an accent
// border pulls it forward against confirmed/rejected ones sitting below.
const BookingCard = styled(Card)`
  border-color: ${({ theme, $pending }) => ($pending ? theme.color.accent : theme.color.border)};
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

const EDITABLE_STATUSES = ["draft", "published", "full"];

// Same session-only draft pattern as PostTrip.jsx's wizard, scoped per trip
// id so a leftover in-progress edit on one trip never leaks into another
// trip's form (this page instance is reused across trips when navigating
// directly from managing one to another — see the id-change effect below).
const draftKey = (tripId) => `manageTrip:${tripId}:draft`;

const loadDraft = (tripId) => {
  try {
    const raw = sessionStorage.getItem(draftKey(tripId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearDraft = (tripId) => {
  try {
    sessionStorage.removeItem(draftKey(tripId));
  } catch {
    // sessionStorage unavailable (private browsing, quota) — draft
    // persistence is a nice-to-have, not required for the form to work.
  }
};

export const ManageTrip = () => {
  const { id } = useParams();

  const [trip, setTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [departureAt, setDepartureAt] = useState("");
  const [estimatedArrivalAt, setEstimatedArrivalAt] = useState("");
  const [pickupPoint, setPickupPoint] = useState({ address: "", lat: null, lng: null });
  const [dropPoint, setDropPoint] = useState({ address: "", lat: null, lng: null });
  const totalCapacityAmount = useUnitAmount();
  const [pricePerTon, setPricePerTon] = useState("");
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // True only when the edit fields currently on screen were restored from a
  // sessionStorage draft rather than the trip's own server values — drives
  // the dismissible DraftNotice below, same as PostTrip.jsx.
  const [showDraftNotice, setShowDraftNotice] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  // Resets the edit fields to the trip's actual current server values —
  // the "no draft" starting point, and also what discarding a draft falls
  // back to.
  const resetEditFieldsFromTrip = (t) => {
    setDepartureAt(toDateTimeInputValue(t.departureAt));
    setEstimatedArrivalAt(t.estimatedArrivalAt ? toDateTimeInputValue(t.estimatedArrivalAt) : "");
    setPickupPoint(normalizePoint(t.pickupPoint));
    setDropPoint(normalizePoint(t.dropPoint));
    totalCapacityAmount.setTons(t.totalCapacity);
    setPricePerTon(String(t.pricePerTon));
  };

  const loadTrip = (cancelled) =>
    getTrip(id)
      .then(({ trip }) => {
        if (cancelled?.current) return;
        setTrip(trip);
        const draft = loadDraft(id);
        if (draft) {
          // A draft exists for this trip — that's itself the cue to open
          // straight into edit mode with the draft's values pre-filled,
          // same as PostTrip.jsx restoring straight into its in-progress
          // step rather than making the user re-enter edit mode to see it.
          setDepartureAt(draft.departureAt ?? toDateTimeInputValue(trip.departureAt));
          setEstimatedArrivalAt(
            draft.estimatedArrivalAt ?? (trip.estimatedArrivalAt ? toDateTimeInputValue(trip.estimatedArrivalAt) : "")
          );
          setPickupPoint(draft.pickupPoint ?? normalizePoint(trip.pickupPoint));
          setDropPoint(draft.dropPoint ?? normalizePoint(trip.dropPoint));
          totalCapacityAmount.setTons(draft.totalCapacityTons ?? trip.totalCapacity);
          setPricePerTon(draft.pricePerTon ?? String(trip.pricePerTon));
          setEditMode(true);
          setShowDraftNotice(true);
        } else {
          resetEditFieldsFromTrip(trip);
        }
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
    // Also drop any edit-mode/draft-notice state left over from whichever
    // trip this instance was previously showing — loadTrip below decides
    // the right starting point (draft vs. display mode) for the new id.
    setEditMode(false);
    setShowDraftNotice(false);
    loadTrip(cancelled);
    loadBookings(cancelled);
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Saves on every change, but only while edit mode is actually showing
  // these fields — the same "save on every change, not just unmount"
  // reasoning as PostTrip.jsx's draft effect, scoped to edit mode so a
  // stale draft from a past edit session never gets written back out (or
  // read as fresh) while the page is just displaying the trip.
  useEffect(() => {
    if (!editMode) return;
    const data = {
      departureAt,
      estimatedArrivalAt,
      pickupPoint,
      dropPoint,
      totalCapacityTons: totalCapacityAmount.tons,
      pricePerTon,
    };
    try {
      sessionStorage.setItem(draftKey(id), JSON.stringify(data));
    } catch {
      // sessionStorage unavailable (private browsing, quota) — draft
      // persistence is a nice-to-have, not required for the form to work.
    }
  }, [
    editMode,
    id,
    departureAt,
    estimatedArrivalAt,
    pickupPoint,
    dropPoint,
    totalCapacityAmount.tons,
    pricePerTon,
  ]);

  const bookedCapacity = trip ? trip.totalCapacity - trip.availableCapacity : 0;

  const validateEdit = () => {
    const errors = {};
    const total = Number(totalCapacityAmount.tons);
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
    if (Number(totalCapacityAmount.tons) !== trip.totalCapacity) updates.totalCapacity = Number(totalCapacityAmount.tons);
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
      clearDraft(id);
      setShowDraftNotice(false);
      setEditMode(false);
      return;
    }

    setSaving(true);
    try {
      const res = await editTrip(id, updates);
      toast.success(res.msg || "Trip updated");
      setTrip(res.trip);
      clearDraft(id);
      setShowDraftNotice(false);
      setEditMode(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Explicit discard — used by both the edit form's own "Cancel" button and
  // the draft notice's dismiss action, so either way of backing out of an
  // in-progress edit drops the sessionStorage draft and puts the fields
  // back to the trip's real current values (rather than leaving stale
  // edited-but-unsaved values sitting in state for the next time edit mode
  // opens).
  const handleDiscardEdit = () => {
    clearDraft(id);
    setShowDraftNotice(false);
    if (trip) resetEditFieldsFromTrip(trip);
    setEditMode(false);
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
  const tripStatusCancellable = !["completed", "cancelled", "expired"].includes(trip.status);
  // tripController.cancelTrip rejects cancellation outright if any booking
  // on the trip is "ongoing" (goods already picked up, in transit) — mirror
  // that here using the bookings this page already loaded, so the button
  // reflects the real blocking condition up front instead of only surfacing
  // it after a doomed confirm dialog + failed request. See also
  // adminController.deactivateTrip, which enforces (and messages) the same
  // rule on the admin side.
  const hasOngoingBooking = bookings.some((b) => b.status === "ongoing");
  // Also wait out loadingBookings — bookings loads in parallel with the
  // trip itself, and showing a clickable Cancel button that then vanishes
  // once bookings resolve (because it turns out one is ongoing) is worse
  // than a brief delay before the button appears at all.
  const canCancel = tripStatusCancellable && !loadingBookings && !hasOngoingBooking;
  const capacityPct = trip.totalCapacity ? Math.min(100, Math.round((bookedCapacity / trip.totalCapacity) * 100)) : 0;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <PageContainer>
      <Stack $gap={5}>
        <HeaderTop>
          <Stack $gap={2}>
            <Row $gap={3} $wrap>
              <PageTitle>
                {trip.fromCity} → {trip.toCity}
              </PageTitle>
              <StatusBadge status={trip.status} />
            </Row>
            <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>
            {trip.estimatedArrivalAt && <Muted>Est. arrival {formatDateTime(trip.estimatedArrivalAt)}</Muted>}
            {trip.status === "draft" && (
              <Muted>
                {trip.truck?.status === "rejected"
                  ? "This trip is hidden from shippers — its truck's documents were rejected. Resubmit them to continue."
                  : "This trip is hidden from shippers until its truck passes verification — it'll go live automatically."}
              </Muted>
            )}
          </Stack>
          <PriceTag>
            <PriceValue>{formatINR(trip.pricePerTon)}</PriceValue>
            <Muted>per ton</Muted>
          </PriceTag>
        </HeaderTop>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Capacity</SectionTitle>
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
                </TimelineContent>
              </TimelineRow>
              <TimelineRow>
                <TimelineMarker>
                  <TimelineDot $variant="drop" />
                </TimelineMarker>
                <TimelineContent style={{ paddingBottom: 0 }}>
                  <Muted>Drop point</Muted>
                  <div>{normalizePoint(trip.dropPoint).address}</div>
                </TimelineContent>
              </TimelineRow>
            </RouteTimeline>
          </Stack>
        </Card>

        <Card>
          {!editMode ? (
            <Stack $gap={3}>
              <SectionTitle>Manage this trip</SectionTitle>
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
              {tripStatusCancellable && hasOngoingBooking && (
                <Muted>
                  Can't cancel — this trip has goods already picked up and in transit. Force-cancel that specific
                  booking instead if it must stop.
                </Muted>
              )}
            </Stack>
          ) : (
            <Stack $gap={5}>
              <SectionTitle>Edit trip</SectionTitle>

              {showDraftNotice && (
                <DraftNotice>
                  <span>Restored your in-progress edits.</span>
                  <DraftDismiss type="button" onClick={handleDiscardEdit}>
                    <X size={13} strokeWidth={2.6} />
                    Discard changes
                  </DraftDismiss>
                </DraftNotice>
              )}

              <FieldGroup $first>
                <SubHeading>Schedule</SubHeading>
                <Field label="Departure date & time" error={editErrors.departureAt}>
                  <Input
                    type="datetime-local"
                    lang="en-GB"
                    value={departureAt}
                    onChange={(e) => setDepartureAt(e.target.value)}
                  />
                </Field>
                <Field label="Estimated arrival (optional)">
                  <Input
                    type="datetime-local"
                    lang="en-GB"
                    value={estimatedArrivalAt}
                    onChange={(e) => setEstimatedArrivalAt(e.target.value)}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <SubHeading>Capacity &amp; price</SubHeading>
                <Field
                  label="Total capacity"
                  error={editErrors.totalCapacity}
                  help={`${formatTons(bookedCapacity)} already booked`}
                >
                  <UnitAmountInput
                    value={totalCapacityAmount.displayValue}
                    unit={totalCapacityAmount.unit}
                    onValueChange={totalCapacityAmount.onValueChange}
                    onUnitChange={totalCapacityAmount.onUnitChange}
                    minTons={0.1}
                  />
                </Field>
                <Field label="Price per ton (INR)" error={editErrors.pricePerTon}>
                  <Input type="number" min="1" step="1" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <SubHeading>Route</SubHeading>
                <Field label="Pickup point" error={editErrors.pickupPoint}>
                  <LocationAutocomplete value={pickupPoint} onChange={setPickupPoint} />
                </Field>
                <Field label="Drop point" error={editErrors.dropPoint}>
                  <LocationAutocomplete value={dropPoint} onChange={setDropPoint} />
                </Field>
              </FieldGroup>

              <Row $gap={3}>
                <Button $fullWidth onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button $variant="ghost" onClick={handleDiscardEdit} disabled={saving}>
                  Cancel
                </Button>
              </Row>
            </Stack>
          )}
        </Card>

        <Stack $gap={3}>
          <Row style={{ justifyContent: "space-between" }}>
            <SectionTitle>Bookings</SectionTitle>
            {!loadingBookings && bookings.length > 0 && (
              <Muted>
                {bookings.length} request{bookings.length === 1 ? "" : "s"}
                {pendingCount > 0 ? ` · ${pendingCount} awaiting you` : ""}
              </Muted>
            )}
          </Row>
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
                <BookingCard key={booking._id} $pending={booking.status === "pending"}>
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

                    {booking.status === "rejected" && booking.rejectReason && (
                      <Muted>Rejected: {booking.rejectReason}</Muted>
                    )}

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
                </BookingCard>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default ManageTrip;
