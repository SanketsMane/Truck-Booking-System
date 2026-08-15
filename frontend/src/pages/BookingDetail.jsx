import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
  getBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  confirmPickup,
  confirmDrop,
} from "../api/bookings";
import { getThreadForBooking, listMessages, sendMessage } from "../api/chat";
import { getSocket, joinThread, leaveThread } from "../api/socket";
import { submitRating } from "../api/ratings";
import { raiseDispute } from "../api/disputes";
import {
  createBookingWalletPayment,
  createBookingRazorpayOrder,
  verifyBookingRazorpayPayment,
} from "../api/wallet";
import { openRazorpayCheckout } from "../utils/razorpayCheckout";
import ReviewList from "../components/ReviewList";
import LiveTruckMap from "../components/LiveTruckMap";
import { PageContainer, PageTitle, SectionTitle, Muted, Stack, Row, Grid, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { Field, Input, Textarea, Select } from "../components/ui/Form";
import { Spinner } from "../components/ui/Spinner";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const CenteredSpinner = ({ $size = 28 }) => (
  <Row style={{ justifyContent: "center", padding: "60px 0" }}>
    <Spinner $size={$size} />
  </Row>
);

const SummaryItem = ({ label, value }) => (
  <Stack $gap={1}>
    <Muted>{label}</Muted>
    <div style={{ fontWeight: 600 }}>{value}</div>
  </Stack>
);

// Shown to the shipper on a confirmed-but-unpaid booking — payment is what
// unlocks "Confirm pickup" server-side (bookingController.confirmPickup),
// so this is the one place a shipper actually pays for a booking.
const BookingPaymentActions = ({ booking, onPaid }) => {
  const [payingWallet, setPayingWallet] = useState(false);
  const [payingRazorpay, setPayingRazorpay] = useState(false);
  const busy = payingWallet || payingRazorpay;

  const handlePayWallet = async () => {
    setPayingWallet(true);
    try {
      await createBookingWalletPayment(booking._id);
      toast.success("Paid from wallet");
      await onPaid();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPayingWallet(false);
    }
  };

  const handlePayRazorpay = async () => {
    setPayingRazorpay(true);
    try {
      const { order } = await createBookingRazorpayOrder(booking._id);
      const response = await openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        description: `Booking ${booking._id}`,
      });
      await verifyBookingRazorpayPayment(booking._id, {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      toast.success("Payment successful");
      await onPaid();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPayingRazorpay(false);
    }
  };

  return (
    <Stack $gap={2}>
      <Muted>Pay ₹{booking.priceEstimate} to move this booking forward.</Muted>
      <Row $gap={2} $wrap>
        <Button onClick={handlePayWallet} disabled={busy}>
          {payingWallet ? "Paying…" : "Pay from wallet"}
        </Button>
        <Button $variant="secondary" onClick={handlePayRazorpay} disabled={busy}>
          {payingRazorpay ? "Opening…" : "Pay with Razorpay"}
        </Button>
      </Row>
    </Stack>
  );
};

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

const ChatScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px 2px;
`;

const ChatBubble = styled.div`
  max-width: 78%;
  align-self: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
  background: ${({ theme, $mine }) => ($mine ? theme.color.accentSoft : theme.color.surfaceRaised)};
  border: 1px solid ${({ theme, $mine }) => ($mine ? "transparent" : theme.color.border)};
  color: ${({ theme }) => theme.color.text};
`;

const BubbleTime = styled.div`
  font-size: 11px;
  opacity: 0.6;
  margin-top: 4px;
`;

const ChatForm = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 12px;
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

  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [chatLoading, setChatLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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

  // Chat: fetch the thread + history for this booking once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { thread: fetchedThread } = await getThreadForBooking(id);
        if (cancelled) return;
        const { messages: history } = await listMessages(fetchedThread._id);
        if (cancelled) return;
        setMessages(history);
        setThread(fetchedThread);
      } catch {
        // No thread available for this booking/user — chat panel stays empty.
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Join the socket room for live updates, paired with leaving it again.
  useEffect(() => {
    if (!thread) return;
    joinThread(thread._id);
    const socket = getSocket();
    const handler = (message) => {
      if (String(message.thread) !== String(thread._id)) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
    };
    socket?.on("chat:message", handler);
    return () => {
      socket?.off("chat:message", handler);
      leaveThread(thread._id);
    };
  }, [thread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !thread) return;
    setSending(true);
    try {
      const { message } = await sendMessage(thread._id, text);
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      setMessageText("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

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

          <Grid $cols={2} $colsTablet={4} $gap={4} style={{ marginTop: 20 }}>
            <SummaryItem label="Capacity booked" value={`${booking.capacityRequested} tons`} />
            <SummaryItem label="Price estimate" value={`₹${booking.priceEstimate}`} />
            <SummaryItem label="Pickup point" value={booking.pickupPoint || "—"} />
            <SummaryItem
              label="Truck"
              value={`${trip.truck?.truckType || "—"}${trip.truck?.regNumber ? ` · ${trip.truck.regNumber}` : ""}`}
            />
            {booking.status !== "pending" && booking.status !== "rejected" && (
              <SummaryItem label="Payment" value={<StatusBadge status={booking.paymentStatus} />} />
            )}
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

        {(booking.status === "confirmed" || booking.status === "ongoing") && (
          <Stack $gap={2}>
            <SectionTitle>Live location</SectionTitle>
            <LiveTruckMap tripId={trip._id} />
          </Stack>
        )}

        <Card>
          <SectionTitle style={{ marginBottom: 12 }}>{isShipper ? "Transporter" : "Shipper"}</SectionTitle>
          <Row $gap={4} $wrap>
            <Stack $gap={1}>
              <div style={{ fontWeight: 600 }}>{counterparty?.name || "—"}</div>
              <Muted>{counterparty?.city || ""}</Muted>
            </Stack>
            {counterparty?.ratingAvg > 0 && (
              <Muted>
                ★ {counterparty.ratingAvg.toFixed(1)}
                {counterparty.ratingCount ? ` (${counterparty.ratingCount})` : ""}
              </Muted>
            )}
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
                {booking.paymentStatus === "paid" ? (
                  <Button onClick={handleConfirmPickup} disabled={actionLoading}>
                    Confirm pickup
                  </Button>
                ) : isShipper ? (
                  <BookingPaymentActions booking={booking} onPaid={loadBooking} />
                ) : (
                  <Muted>Waiting for the shipper to complete payment before pickup can be confirmed.</Muted>
                )}
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
                      <option value="payment_issue">Payment issue</option>
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
          <SectionTitle style={{ marginBottom: 14 }}>Messages</SectionTitle>
          {chatLoading ? (
            <CenteredSpinner $size={22} />
          ) : !thread ? (
            <Muted>Chat isn't available for this booking.</Muted>
          ) : (
            <>
              <ChatScroll>
                {messages.length === 0 && <Muted>No messages yet — say hello.</Muted>}
                {messages.map((m) => (
                  <ChatBubble key={m._id} $mine={String(m.sender) === String(user?.id)}>
                    {m.text}
                    <BubbleTime>
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </BubbleTime>
                  </ChatBubble>
                ))}
                <div ref={messagesEndRef} />
              </ChatScroll>
              <ChatForm onSubmit={handleSendMessage}>
                <Input
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !messageText.trim()}>
                  Send
                </Button>
              </ChatForm>
            </>
          )}
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default BookingDetail;
