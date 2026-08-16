import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { LifeBuoy, MessageSquare } from "lucide-react";
import * as supportApi from "../api/support";
import { listMyBookings } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { PageContainer, SectionTitle, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select, Textarea } from "../components/ui/Form";
import { StatusBadge } from "../components/ui/Badge";
import { Pagination } from "../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../components/ui/Table";
import { SkeletonTableRows } from "../components/ui/Skeleton";
import {
  Toolbar,
  SearchInput,
  ToolbarSelect,
  ToolbarSpacer,
  ResultsCount,
  ClearFiltersButton,
} from "../components/ui/Toolbar";
import { formatDate, formatDateTime } from "../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const DetailRow = styled.tr`
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

// Icon-prefixed subject + a one-line message preview underneath, so the
// table reads as a scannable ticket history rather than a bare subject
// column — same treatment as the admin console's support queue
// (pages/admin/Support.jsx's SubjectText/MessagePreview), ported to the
// consumer palette.
const SubjectText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const MessagePreview = styled.div`
  max-width: 320px;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

// The subject cell now carries two lines (subject + preview) while every
// other cell in the row is single-line — top-align it so it doesn't drift
// to the vertical center of the (now taller) row.
const SubjectTd = styled(Td)`
  vertical-align: top;
`;

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
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (status && r.status !== status) return false;
      if (!q) return true;
      return `${r.subject} ${r.message}`.toLowerCase().includes(q);
    });
  }, [requests, status, search]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(status || search);

  const clearFilters = () => {
    setStatus("");
    setSearch("");
    setPage(1);
  };

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

          <Toolbar>
            <ToolbarSelect
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </ToolbarSelect>
            <SearchInput
              placeholder="Search subject or message…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <ToolbarSpacer />
            {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
            {!loading && <ResultsCount>{total} request{total === 1 ? "" : "s"}</ResultsCount>}
          </Toolbar>

          <Card $padding="0">
            {!loading && paged.length === 0 ? (
              <EmptyState style={{ margin: 20 }}>
                <LifeBuoy size={26} strokeWidth={1.6} />
                <Muted>
                  {requests.length === 0
                    ? "You haven't raised any support requests yet."
                    : "No requests match these filters."}
                </Muted>
              </EmptyState>
            ) : (
              <>
                <TableScroll>
                  <Table $minWidth="680px">
                    <thead>
                      <tr>
                        <IndexTh>#</IndexTh>
                        <Th>Subject</Th>
                        <Th>Related booking</Th>
                        <Th>Status</Th>
                        <Th>Raised</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <SkeletonTableRows rows={pageSize > 10 ? 10 : pageSize} cols={5} />
                      ) : (
                        paged.map((r, i) => (
                          <Fragment key={r._id}>
                            <Tr
                              style={{ cursor: "pointer" }}
                              onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                            >
                              <IndexTd style={{ verticalAlign: "top" }}>{(page - 1) * pageSize + i + 1}</IndexTd>
                              <SubjectTd>
                                <SubjectText>
                                  <MessageSquare size={14} strokeWidth={2.2} />
                                  {r.subject}
                                </SubjectText>
                                <MessagePreview>{r.message}</MessagePreview>
                              </SubjectTd>
                              <Td style={{ verticalAlign: "top" }}>
                                <Muted>{r.booking?.goodsDescription || "—"}</Muted>
                              </Td>
                              <Td style={{ verticalAlign: "top" }}>
                                <StatusBadge status={r.status === "resolved" ? "completed" : "pending"}>
                                  {r.status}
                                </StatusBadge>
                              </Td>
                              <Td style={{ verticalAlign: "top" }}>{formatDateTime(r.createdAt)}</Td>
                            </Tr>
                            {expandedId === r._id && (
                              <DetailRow>
                                <Td colSpan={5}>
                                  <Muted style={{ whiteSpace: "pre-wrap" }}>{r.message}</Muted>
                                </Td>
                              </DetailRow>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </Table>
                </TableScroll>
                <div style={{ padding: "0 20px 16px" }}>
                  {!loading && (
                    <Pagination
                      page={page}
                      pages={pages}
                      total={total}
                      onPageChange={setPage}
                      pageSize={pageSize}
                      onPageSizeChange={(n) => {
                        setPageSize(n);
                        setPage(1);
                      }}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                    />
                  )}
                </div>
              </>
            )}
          </Card>
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default Support;
