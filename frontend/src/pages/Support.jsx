import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as supportApi from "../api/support";
import { listMyBookings } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select, Textarea } from "../components/ui/Form";
import { StatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { formatDate, formatDateTime } from "../utils/format";

// e.g. "Delhi → Jaipur · 14 Aug 2026 · confirmed"
const bookingLabel = (b) => {
  const trip = b.trip;
  const route = trip ? `${trip.fromCity} → ${trip.toCity}` : "Booking";
  return [route, formatDate(trip?.departureAt), b.status].filter(Boolean).join(" · ");
};

export const Support = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const load = async () => {
    try {
      const { requests } = await supportApi.listMySupportRequests();
      setRequests(requests || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  // Own bookings for the picker below — a user may hold both roles, so
  // fetch each side they hold and merge (any given booking only ever
  // belongs to one side, so this is a concat, not a real de-dupe need —
  // but dedupe by _id defensively anyway). No status filter: someone
  // raising a request may want to reference a booking in any state.
  useEffect(() => {
    (async () => {
      try {
        const roles = user?.roles?.length ? user.roles : [];
        const results = await Promise.all(
          roles.map((role) => listMyBookings({ role }).then((r) => r.bookings || []))
        );
        const merged = [];
        const seen = new Set();
        for (const b of results.flat()) {
          if (seen.has(b._id)) continue;
          seen.add(b._id);
          merged.push(b);
        }
        setBookings(merged);

        // Preselect from ?bookingId= (e.g. arriving via "Contact support" on a
        // booking's page) — only if it's actually present in the fetched
        // list, so a stale/foreign id just leaves the selection unset rather
        // than crashing or pointing at a nonexistent option.
        const preselect = searchParams.get("bookingId");
        if (preselect && merged.some((b) => b._id === preselect)) {
          setBookingId(preselect);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoadingBookings(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in a subject and a message");
      return;
    }
    setSubmitting(true);
    try {
      await supportApi.createSupportRequest({
        subject: subject.trim(),
        message: message.trim(),
        bookingId: bookingId || undefined,
      });
      toast.success("Your request has been sent to our team");
      setSubject("");
      setMessage("");
      setBookingId("");
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <Stack $gap={5}>
        <PageTitle>Support</PageTitle>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Raise a request</SectionTitle>
            <Muted>Facing an issue with a booking or trip? Tell us what's wrong and we'll help.</Muted>
            <form onSubmit={handleSubmit}>
              <Stack $gap={3}>
                <Field label="Subject">
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Driver didn't show up"
                  />
                </Field>
                <Field label="Message">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe what happened…"
                  />
                </Field>
                <Field
                  label="Related booking (optional)"
                  help="If this is about a specific booking, pick it here so our team has the context."
                >
                  <Select
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    disabled={loadingBookings}
                  >
                    <option value="">
                      {loadingBookings ? "Loading your bookings…" : "None — general question"}
                    </option>
                    {bookings.map((b) => (
                      <option key={b._id} value={b._id}>
                        {bookingLabel(b)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Row>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Send request"}
                  </Button>
                </Row>
              </Stack>
            </form>
          </Stack>
        </Card>

        <Stack $gap={3}>
          <SectionTitle>Your requests</SectionTitle>
          {loading ? (
            <Row style={{ justifyContent: "center", padding: "40px 0" }}>
              <Spinner $size={26} />
            </Row>
          ) : requests.length === 0 ? (
            <EmptyState>
              <Muted>You haven't raised any support requests yet.</Muted>
            </EmptyState>
          ) : (
            <Stack $gap={2}>
              {requests.map((r) => (
                <Card key={r._id}>
                  <Stack $gap={2}>
                    <CardRow>
                      <strong>{r.subject}</strong>
                      <StatusBadge status={r.status === "resolved" ? "completed" : "pending"}>
                        {r.status}
                      </StatusBadge>
                    </CardRow>
                    <Muted>{r.message}</Muted>
                    <Muted>Raised {formatDateTime(r.createdAt)}</Muted>
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

export default Support;
