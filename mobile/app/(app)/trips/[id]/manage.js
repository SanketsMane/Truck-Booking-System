import { useCallback, useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../../../src/components/ui/Typography";
import { Card } from "../../../../src/components/ui/Card";
import { Button } from "../../../../src/components/ui/Button";
import { TextField } from "../../../../src/components/ui/TextField";
import { StatusBadge } from "../../../../src/components/ui/Badge";
import { LoadingView } from "../../../../src/components/ui/LoadingView";
import { theme } from "../../../../src/theme";
import { getTrip, editTrip, cancelTrip } from "../../../../src/api/trips";
import { listMyBookings, acceptBooking, rejectBooking } from "../../../../src/api/bookings";
import { formatINR, formatTons, formatDateTime } from "../../../../src/utils/format";

const EDITABLE_STATUSES = ["draft", "published", "full"];

export const ManageTripScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricePerTon, setPricePerTon] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getTrip(id), listMyBookings({ role: "transporter", tripId: id })])
      .then(([tripRes, bookingsRes]) => {
        setTrip(tripRes.trip);
        setPricePerTon(String(tripRes.trip.pricePerTon));
        setBookings(bookingsRes.bookings || []);
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSavePrice = async () => {
    setBusy(true);
    try {
      await editTrip(id, { pricePerTon: Number(pricePerTon) });
      setMessage("Trip updated");
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTrip = async () => {
    setBusy(true);
    try {
      await cancelTrip(id);
      setMessage("Trip cancelled");
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    setBusy(true);
    try {
      if (action === "accept") await acceptBooking(bookingId);
      else await rejectBooking(bookingId, "Not available");
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingView />;
  if (!trip) return <Screen title=""><Muted>{message || "Trip not found"}</Muted></Screen>;

  const canEdit = EDITABLE_STATUSES.includes(trip.status);

  return (
    <Screen scroll={false} title="">
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.rowBetween}>
              <PageTitle>
                {trip.fromCity} → {trip.toCity}
              </PageTitle>
              <StatusBadge status={trip.status} />
            </View>
            <Muted>Departs {formatDateTime(trip.departureAt)}</Muted>

            {canEdit && (
              <Card>
                <SectionTitle>Edit price</SectionTitle>
                <TextField label="Price per ton (₹)" value={pricePerTon} onChangeText={setPricePerTon} keyboardType="numeric" />
                <Button title="Save" onPress={handleSavePrice} loading={busy} fullWidth />
              </Card>
            )}

            {message ? <Muted style={styles.message}>{message}</Muted> : null}

            {!["cancelled", "completed", "expired"].includes(trip.status) && (
              <Button title="Cancel trip" variant="danger" onPress={handleCancelTrip} loading={busy} fullWidth />
            )}

            <SectionTitle>Bookings on this trip</SectionTitle>
          </View>
        }
        ListEmptyComponent={<Muted>No booking requests yet.</Muted>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(app)/bookings/${item._id}`)}>
            <Card style={styles.bookingCard}>
              <View style={styles.rowBetween}>
                <Body>{item.shipper?.name}</Body>
                <StatusBadge status={item.status} />
              </View>
              <Muted>
                {formatTons(item.capacityRequested)} · {formatINR(item.priceEstimate)}
              </Muted>
              {item.status === "pending" && (
                <View style={styles.row}>
                  <Button title="Accept" onPress={() => handleBookingAction(item._id, "accept")} loading={busy} />
                  <Button title="Reject" variant="danger" onPress={() => handleBookingAction(item._id, "reject")} loading={busy} />
                </View>
              )}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { padding: theme.space(4), gap: theme.space(3) },
  headerBlock: { gap: theme.space(3), marginBottom: theme.space(2) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 10 },
  bookingCard: { gap: theme.space(2) },
  message: { color: theme.color.accent },
});

export default ManageTripScreen;
