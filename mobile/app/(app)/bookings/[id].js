import { useCallback, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { TextField } from "../../../src/components/ui/TextField";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import {
  getBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  confirmPickup,
  confirmDrop,
} from "../../../src/api/bookings";
import { submitRating } from "../../../src/api/ratings";
import { raiseDispute } from "../../../src/api/disputes";
import { formatINR, formatTons, formatDateTime } from "../../../src/utils/format";
import { useAuth } from "../../../src/context/AuthContext";

const STARS = [1, 2, 3, 4, 5];

export const BookingDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [stars, setStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getBooking(id)
      .then((res) => setBooking(res.booking))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isTransporter = booking && String(booking.trip?.transporter?._id || booking.trip?.transporter) === user?.id;

  const runAction = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!stars) {
      setError("Pick a star rating");
      return;
    }
    await runAction(() => submitRating({ bookingId: id, stars, reviewText: reviewText.trim() || undefined }));
  };

  const handleRaiseDispute = async () => {
    if (!disputeDescription.trim()) {
      setError("Describe the issue");
      return;
    }
    await runAction(() =>
      raiseDispute({ bookingId: id, category: "other", description: disputeDescription.trim() }).then(() => setShowDispute(false))
    );
  };

  if (loading) return <LoadingView />;
  if (!booking) return <Screen><Muted>{error || "Booking not found"}</Muted></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>
          {booking.trip?.fromCity} → {booking.trip?.toCity}
        </PageTitle>
        <StatusBadge status={booking.status} />
      </View>

      <Card>
        <SectionTitle>Summary</SectionTitle>
        <View style={styles.rowBetween}>
          <Muted>Capacity</Muted>
          <Body>{formatTons(booking.capacityRequested)}</Body>
        </View>
        <View style={styles.rowBetween}>
          <Muted>Price</Muted>
          <Body>{formatINR(booking.priceEstimate)}</Body>
        </View>
        <View style={styles.rowBetween}>
          <Muted>Departure</Muted>
          <Body>{formatDateTime(booking.trip?.departureAt)}</Body>
        </View>
        <Muted>Goods: {booking.goodsDescription}</Muted>
      </Card>

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <View style={styles.actions}>
        {isTransporter && booking.status === "pending" && (
          <>
            <Button title="Accept" onPress={() => runAction(() => acceptBooking(id))} loading={busy} fullWidth />
            <Button title="Reject" variant="danger" onPress={() => runAction(() => rejectBooking(id, "Not available"))} loading={busy} fullWidth />
          </>
        )}
        {booking.status === "confirmed" && !isTransporter && (
          <Button title="Confirm pickup" onPress={() => runAction(() => confirmPickup(id))} loading={busy} fullWidth />
        )}
        {booking.status === "ongoing" && (
          <Button title="Confirm drop" onPress={() => runAction(() => confirmDrop(id))} loading={busy} fullWidth />
        )}
        {["pending", "confirmed"].includes(booking.status) && (
          <Button title="Cancel booking" variant="ghost" onPress={() => runAction(() => cancelBooking(id, "Change of plans"))} loading={busy} fullWidth />
        )}
        <Button title="Message" variant="secondary" onPress={() => router.push(`/(app)/chat/booking-${id}`)} fullWidth />
      </View>

      {booking.status === "completed" && (
        <Card>
          <SectionTitle>Rate this trip</SectionTitle>
          <View style={styles.starsRow}>
            {STARS.map((s) => (
              <Pressable key={s} onPress={() => setStars(s)}>
                <Body style={{ fontSize: 28, color: s <= stars ? theme.color.warning : theme.color.border }}>★</Body>
              </Pressable>
            ))}
          </View>
          <TextField label="Review (optional)" value={reviewText} onChangeText={setReviewText} placeholder="How did it go?" />
          <Button title="Submit rating" onPress={handleSubmitRating} loading={busy} fullWidth />

          {!showDispute ? (
            <Button title="Report an issue" variant="ghost" onPress={() => setShowDispute(true)} fullWidth />
          ) : (
            <>
              <TextField label="What went wrong?" value={disputeDescription} onChangeText={setDisputeDescription} placeholder="Describe the issue" />
              <Button title="Submit report" variant="danger" onPress={handleRaiseDispute} loading={busy} fullWidth />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  error: { color: theme.color.danger },
  actions: { gap: theme.space(2) },
  starsRow: { flexDirection: "row", gap: 8 },
});

export default BookingDetailScreen;
