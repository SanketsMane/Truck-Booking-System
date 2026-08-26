import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../../../src/components/ui/Typography";
import { Card } from "../../../../src/components/ui/Card";
import { Button } from "../../../../src/components/ui/Button";
import { TextField } from "../../../../src/components/ui/TextField";
import { StatusBadge } from "../../../../src/components/ui/Badge";
import { LoadingView } from "../../../../src/components/ui/LoadingView";
import { theme } from "../../../../src/theme";
import { getTrip } from "../../../../src/api/trips";
import { createBooking } from "../../../../src/api/bookings";
import { formatINR, formatTons, formatDateTime } from "../../../../src/utils/format";
import { useAuth } from "../../../../src/context/AuthContext";

export const TripDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState("");
  const [goodsDescription, setGoodsDescription] = useState("");
  const [handlingNotes, setHandlingNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTrip(id)
      .then((res) => setTrip(res.trip))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    const cap = Number(capacity);
    if (!cap || cap <= 0) {
      setError("Enter the capacity you need");
      return;
    }
    if (!goodsDescription.trim()) {
      setError("Describe the goods");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await createBooking({
        tripId: id,
        capacityRequested: cap,
        goodsDescription: goodsDescription.trim(),
        handlingNotes: handlingNotes.trim() || undefined,
        pickupPoint: trip.pickupPoint,
      });
      router.replace(`/(app)/bookings/${res.booking._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView />;
  if (!trip) return <Screen><Muted>{error || "Trip not found"}</Muted></Screen>;

  const isBookable = trip.status === "published";
  const canBook = isBookable && user?.roles?.includes("shipper");
  // Viewing a trip is public (matches the web app) — only requesting to
  // book it needs an account, so a logged-out visitor sees a "log in to
  // book" prompt here rather than the trip being gated entirely.
  const needsLoginToBook = isBookable && !user;

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>
          {trip.fromCity} → {trip.toCity}
        </PageTitle>
        <StatusBadge status={trip.status} />
      </View>

      <Card>
        <SectionTitle>Route</SectionTitle>
        <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>
        {trip.estimatedArrivalAt && <Muted>Arrives ~{formatDateTime(trip.estimatedArrivalAt)}</Muted>}
        <View style={styles.rowBetween}>
          <Muted>Pickup</Muted>
          <Body>{trip.pickupPoint?.address}</Body>
        </View>
        <View style={styles.rowBetween}>
          <Muted>Drop</Muted>
          <Body>{trip.dropPoint?.address}</Body>
        </View>
      </Card>

      <Card>
        <SectionTitle>Truck & capacity</SectionTitle>
        <Muted>
          {trip.truck?.regNumber} · {trip.truck?.truckType}
        </Muted>
        <View style={styles.rowBetween}>
          <Muted>Available</Muted>
          <Body>{formatTons(trip.availableCapacity)}</Body>
        </View>
        <View style={styles.rowBetween}>
          <Muted>Price</Muted>
          <Body>{formatINR(trip.pricePerTon)}/ton</Body>
        </View>
      </Card>

      <Card>
        <SectionTitle>Transporter</SectionTitle>
        <Body>{trip.transporter?.name}</Body>
        {trip.transporterVerified && <StatusBadge status="verified">Verified</StatusBadge>}
        {trip.transporter?.ratingAvg != null && <Muted>★ {trip.transporter.ratingAvg.toFixed(1)} rating</Muted>}
      </Card>

      {canBook && (
        <Card>
          <SectionTitle>Request to book</SectionTitle>
          <TextField
            label="Capacity needed (tons)"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
            placeholder="e.g. 5"
          />
          <TextField label="Goods description" value={goodsDescription} onChangeText={setGoodsDescription} placeholder="e.g. Textile bales" />
          <TextField label="Handling notes (optional)" value={handlingNotes} onChangeText={setHandlingNotes} placeholder="Fragile, needs a tail lift, etc." />
          {error ? <Muted style={styles.error}>{error}</Muted> : null}
          <Button title="Request to book" onPress={handleBook} loading={submitting} fullWidth />
        </Card>
      )}

      {needsLoginToBook && (
        <Card>
          <SectionTitle>Want to book this trip?</SectionTitle>
          <Muted>Log in or create a free account to send a booking request.</Muted>
          <Button title="Log in to book" onPress={() => router.push("/(auth)/login")} fullWidth />
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  error: { color: theme.color.danger },
});

export default TripDetailScreen;
