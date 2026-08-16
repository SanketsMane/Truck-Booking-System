import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  confirmPickup,
  confirmDrop,
} from "../api/bookings";
import { getThreadForBooking } from "../api/chat";
import { submitRating } from "../api/ratings";
import { raiseDispute } from "../api/disputes";
import ReviewList from "../components/ReviewList";
import { ChatPanel } from "../components/chat/ChatPanel";
import { PageContainer, PageTitle, SectionTitle, Muted, Stack, Row, Grid, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { BookingStatusTimeline } from "../components/ui/BookingStatusTimeline";
import { Avatar } from "../components/ui/Avatar";
import { Field, Textarea, Select } from "../components/ui/Form";
import { Spinner } from "../components/ui/Spinner";
import { formatDateTime, normalizePoint } from "../utils/format";

const CenteredSpinner = ({ $size = 28 }) => (
  <Row style={{ justifyContent: "center", padding: "60px 0" }}>
    <Spinner $size={$size} />
  </Row>
);

const SummaryValue = styled.div`
  font-weight: ${({ $accent }) => ($accent ? 800 : 600)};
  color: ${({ theme, $accent }) => ($accent ? theme.color.accent : theme.color.text)};
`;

const SummaryItem = ({ label, value, $accent }) => (
  <Stack $gap={1}>
    <Muted>{label}</Muted>
    <SummaryValue $accent={$accent}>{value}</SummaryValue>
  </Stack>
);

const StarButton = styled.button`
  background: none;
  border: none;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  color: ${({ theme, $filled }) => ($filled ? theme.color.accent : theme.color.border)};
  padding: 2px 4px;
`;

const StarPicker = ({ value, onChange }) => (
  <Row $gap={1}>
    {[1, 2, 3, 4, 5].map((n) => (
      <StarButton
        key={n}
        type="button"
        $filled={n <= value}
        onClick={() => onChange(n)}
        aria-label={`${n} star${n > 1 ? "s" : ""}`}
      >
        {n <= value ? "★" : "☆"}
      </StarButton>
    ))}
  </Row>
);

const OpenChatLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};

  &:hover {
    text-decoration: underline;
  }
`;

export const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("no_show");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  // Just the id, for the "Open full conversation" link — ChatPanel below
  // resolves and owns the actual thread/messages/socket state itself.
  const [threadId, setThreadId] = useState(null);

  const loadBooking = useCallback(async () => {
    try {
      const { booking } = await getBooking(id);
      setBooking(booking);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await loadBooking();
    })();
  }, [loadBooking]);

  useEffect(() => {
    let cancelled = false;
    getThreadForBooking(id)
      .then(({ thread }) => {
        if (!cancelled) setThreadId(thread._id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Accept/reject/cancel/confirm-pickup/confirm-drop all return the bare
  // booking doc (no trip/shipper populate — those endpoints don't need it
  // for their own response). Re-fetch the populated version this page
  // actually renders from, rather than trust the mutation response's shape.
  const runAction = async (fn, successMsg) => {
    setActionLoading(true);
    try {
      await fn();
      await loadBooking();
      if (successMsg) toast.success(successMsg);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () => runAction(() => acceptBooking(id), "Booking accepted");

  const handleReject = async (e) => {
    e.preventDefault();
    const ok = await runAction(() => rejectBooking(id, rejectReason.trim()), "Booking rejected");
    if (ok) setShowRejectForm(false);
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    const ok = await runAction(() => cancelBooking(id, cancelReason.trim()), "Booking cancelled");
    if (ok) setShowCancelForm(false);
  };

  const handleConfirmPickup = () => runAction(() => confirmPickup(id), "Pickup confirmed — booking is now ongoing");
  const handleConfirmDrop = () => runAction(() => confirmDrop(id), "Drop confirmed — booking completed");

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (ratingStars === 0) {
      toast.error("Pick a star rating first");
      return;
    }
    setRatingSubmitting(true);
    try {
      await submitRating({ bookingId: id, stars: ratingStars, reviewText: ratingText.trim() });
      toast.success("Rating submitted — thank you");
      setRatingSubmitted(true);
    } catch (err) {
      if (err.status === 409) {
        setRatingSubmitted(true);
        toast.info(err.message);
      } else {
        toast.error(err.message);
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (disputeDescription.trim().length < 10) {
      toast.error("Describe what happened in a bit more detail (at least 10 characters)");
      return;
    }
    setDisputeSubmitting(true);
    try {
      await raiseDispute({ bookingId: id, category: disputeCategory, description: disputeDescription.trim() });
      toast.success("Your report has been submitted — our team will review it");
      setDisputeSubmitted(true);
      setShowDisputeForm(false);
    } catch (err) {
      if (err.status === 409) {
        setDisputeSubmitted(true);
        toast.info(err.message);
      } else {
        toast.error(err.message);
      }
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <CenteredSpinner $size={32} />
      </PageContainer>
    );
  }

  // booking.trip/shipper/transporter are populated relations — guard against
  // rendering mid-fetch or against a malformed record the same way the rest
  // of the app treats populated fields as possibly absent.
  if (!booking || !booking.trip || !booking.shipper || !booking.trip.transporter) {
    return (
      <PageContainer>
        <PageTitle style={{ marginBottom: 20 }}>Booking details</PageTitle>
        <EmptyState>This booking could not be found.</EmptyState>
      </PageContainer>
    );
  }

  const trip = booking.trip;
  const isShipper = user && String(booking.shipper._id) === user.id;
  const isTransporter = user && String(trip.transporter._id) === user.id;
  const counterparty = isShipper ? trip.transporter : booking.shipper;

  const canAcceptReject = isTransporter && booking.status === "pending";
  const canConfirmPickup = (isShipper || isTransporter) && booking.status === "confirmed";
  const canConfirmDrop = (isShipper || isTransporter) && booking.status === "ongoing";
  const hasAnyAction = canAcceptReject || canConfirmPickup || canConfirmDrop;

  return (
    <PageContainer>
      <PageTitle style={{ marginBottom: 20 }}>Booking details</PageTitle>

      <Stack $gap={5}>
        <Card>
          <CardRow>
            <Stack $gap={1}>
              <SectionTitle>
                {trip.fromCity} → {trip.toCity}
              </SectionTitle>
              <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>
            </Stack>
            <StatusBadge status={booking.status} />
          </CardRow>

          <div style={{ marginTop: 24 }}>
            <BookingStatusTimeline status={booking.status} />
          </div>

          <Grid $cols={2} $colsTablet={4} $gap={4} style={{ marginTop: 24 }}>
            <SummaryItem label="Capacity booked" value={`${booking.capacityRequested} tons`} />
            <SummaryItem label="Price estimate" value={`₹${booking.priceEstimate}`} $accent />
            <SummaryItem label="Pickup point" value={normalizePoint(booking.pickupPoint).address || "—"} />
            <SummaryItem
              label="Truck"
              value={`${trip.truck?.truckType || "—"}${trip.truck?.regNumber ? ` · ${trip.truck.regNumber}` : ""}`}
            />
          </Grid>

          <Stack $gap={3} style={{ marginTop: 20 }}>
            <SummaryItem label="Goods description" value={booking.goodsDescription} />
            {booking.handlingNotes && <SummaryItem label="Handling notes" value={booking.handlingNotes} />}
          </Stack>

          {booking.status === "rejected" && booking.rejectReason && (
            <Muted style={{ marginTop: 16 }}>Rejected: {booking.rejectReason}</Muted>
          )}
          {booking.status === "cancelled" && booking.cancelReason && (
            <Muted style={{ marginTop: 16 }}>Cancelled: {booking.cancelReason}</Muted>
          )}
        </Card>

        <Card>
          <SectionTitle style={{ marginBottom: 14 }}>{isShipper ? "Transporter" : "Shipper"}</SectionTitle>
          <Row $gap={3}>
            <Avatar name={counterparty?.name} />
            <Stack $gap={1}>
              <div style={{ fontWeight: 700 }}>{counterparty?.name || "—"}</div>
              <Muted>
                {counterparty?.city ? `${counterparty.city} · ` : ""}
                {counterparty?.ratingAvg > 0
                  ? `★ ${counterparty.ratingAvg.toFixed(1)}${counterparty.ratingCount ? ` (${counterparty.ratingCount})` : ""}`
                  : "No ratings yet"}
              </Muted>
            </Stack>
          </Row>
        </Card>

        {counterparty?._id && <ReviewList userId={counterparty._id} title={`Reviews for the ${isShipper ? "transporter" : "shipper"}`} />}

        <Card>
          <SectionTitle style={{ marginBottom: 14 }}>Actions</SectionTitle>
          <Stack $gap={3}>
            {canAcceptReject && !showRejectForm && (
              <Row $gap={3} $wrap>
                <Button onClick={handleAccept} disabled={actionLoading}>
                  Accept booking
                </Button>
                <Button $variant="danger" onClick={() => setShowRejectForm(true)} disabled={actionLoading}>
                  Reject
                </Button>
              </Row>
            )}
            {canAcceptReject && showRejectForm && (
              <form onSubmit={handleReject}>
                <Field label="Reason for rejecting (optional)">
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Let the shipper know why"
                  />
                </Field>
                <Row $gap={2}>
                  <Button type="submit" $variant="danger" disabled={actionLoading}>
                    Confirm reject
                  </Button>
                  <Button type="button" $variant="ghost" onClick={() => setShowRejectForm(false)}>
                    Back
                  </Button>
                </Row>
              </form>
            )}

            {canConfirmPickup && (
              <Stack $gap={3}>
                <Button onClick={handleConfirmPickup} disabled={actionLoading}>
                  Confirm pickup
                </Button>
                {!showCancelForm ? (
                  <Stack $gap={1}>
                    <Button $variant="danger" onClick={() => setShowCancelForm(true)} disabled={actionLoading}>
                      Cancel booking
                    </Button>
                    <Muted>Free cancellation up to 6 hours before departure — no penalty either side.</Muted>
                  </Stack>
                ) : (
                  <form onSubmit={handleCancel}>
                    <Field label="Reason for cancelling (optional)" help="This can't be undone">
                      <Textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Let the other party know why"
                      />
                    </Field>
                    <Row $gap={2}>
                      <Button type="submit" $variant="danger" disabled={actionLoading}>
                        Yes, cancel booking
                      </Button>
                      <Button type="button" $variant="ghost" onClick={() => setShowCancelForm(false)}>
                        Never mind
                      </Button>
                    </Row>
                  </form>
                )}
              </Stack>
            )}

            {canConfirmDrop && (
              <Button onClick={handleConfirmDrop} disabled={actionLoading}>
                Confirm drop
              </Button>
            )}

            {!hasAnyAction && (
              <Muted>
                {booking.status === "pending" && "Waiting for the transporter to respond."}
                {booking.status === "completed" && "This booking is complete."}
                {booking.status === "rejected" && "This booking request was rejected."}
                {booking.status === "cancelled" && "This booking was cancelled."}
                {booking.status === "expired" && "This booking request expired without a response."}
              </Muted>
            )}

            <Row>
              <Button
                type="button"
                $variant="ghost"
                $size="sm"
                onClick={() => navigate(`/support?bookingId=${booking._id}`)}
              >
                Contact support about this booking
              </Button>
            </Row>
          </Stack>
        </Card>

        {booking.status === "completed" && (
          <Card>
            <SectionTitle style={{ marginBottom: 14 }}>Rate {isShipper ? "the transporter" : "the shipper"}</SectionTitle>
            {ratingSubmitted ? (
              <Muted>Thanks — your rating has been submitted.</Muted>
            ) : (
              <form onSubmit={handleSubmitRating}>
                <Field label="Stars">
                  <StarPicker value={ratingStars} onChange={setRatingStars} />
                </Field>
                <Field label="Review (optional)">
                  <Textarea
                    value={ratingText}
                    onChange={(e) => setRatingText(e.target.value)}
                    placeholder="How was the experience?"
                  />
                </Field>
                <Button type="submit" disabled={ratingSubmitting || ratingStars === 0} $fullWidth>
                  {ratingSubmitting ? "Submitting…" : "Submit rating"}
                </Button>
              </form>
            )}
          </Card>
        )}

        {booking.status === "completed" && (
          <Card>
            <SectionTitle style={{ marginBottom: 14 }}>Report an issue</SectionTitle>
            {disputeSubmitted ? (
              <Muted>We've received your report — our team will review it and get back to you.</Muted>
            ) : !showDisputeForm ? (
              <Stack $gap={2}>
                <Muted>Did something go wrong with this booking? Let us know and we'll take a look.</Muted>
                <Row>
                  <Button type="button" $variant="secondary" $size="sm" onClick={() => setShowDisputeForm(true)}>
                    Report an issue
                  </Button>
                </Row>
              </Stack>
            ) : (
              <form onSubmit={handleRaiseDispute}>
                <Stack $gap={3}>
                  <Field label="What kind of issue?">
                    <Select value={disputeCategory} onChange={(e) => setDisputeCategory(e.target.value)}>
                      <option value="no_show">No-show</option>
                      <option value="damaged_goods">Damaged goods</option>
                      <option value="behavior">Behavior</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Describe what happened">
                    <Textarea
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder="Give our team enough detail to review this"
                    />
                  </Field>
                  <Row $gap={2}>
                    <Button type="submit" disabled={disputeSubmitting}>
                      {disputeSubmitting ? "Submitting…" : "Submit report"}
                    </Button>
                    <Button type="button" $variant="ghost" onClick={() => setShowDisputeForm(false)} disabled={disputeSubmitting}>
                      Cancel
                    </Button>
                  </Row>
                </Stack>
              </form>
            )}
          </Card>
        )}

        <Card>
          <CardRow style={{ marginBottom: 14 }}>
            <SectionTitle>Messages</SectionTitle>
            {threadId && (
              <OpenChatLink to={`/chat/${threadId}`}>
                <MessageCircle size={14} strokeWidth={2.4} />
                Open full conversation
              </OpenChatLink>
            )}
          </CardRow>
          <ChatPanel bookingId={id} />
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default BookingDetail;
