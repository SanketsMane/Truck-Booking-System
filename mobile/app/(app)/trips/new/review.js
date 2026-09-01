import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { SectionTitle, Body, Muted } from "../../../../src/components/ui/Typography";
import { Card } from "../../../../src/components/ui/Card";
import { Button } from "../../../../src/components/ui/Button";
import { theme } from "../../../../src/theme";
import { postTrip } from "../../../../src/api/trips";
import { cleanStops } from "../../../../src/components/TripStopsField";
import { usePostTripDraft } from "../../../../src/context/PostTripContext";
import { formatINR, formatTons, formatDate } from "../../../../src/utils/format";

export const PostTripReviewScreen = () => {
  const router = useRouter();
  const { draft } = usePostTripDraft();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePublish = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await postTrip({
        truckId: draft.truckId,
        fromCity: (draft.fromCity || draft.fromPoint.address).trim(),
        toCity: (draft.toCity || draft.toPoint.address).trim(),
        departureAt: draft.departureAt.toISOString(),
        estimatedArrivalAt: draft.estimatedArrivalAt ? draft.estimatedArrivalAt.toISOString() : undefined,
        pickupPoint: { ...draft.pickupPoint, address: draft.pickupPoint.address.trim() },
        dropPoint: { ...draft.dropPoint, address: draft.dropPoint.address.trim() },
        stops: cleanStops(draft.stops),
        totalCapacity: Number(draft.totalCapacity),
        availableCapacity: Number(draft.availableCapacity),
        pricePerTon: Number(draft.pricePerTon),
      });
      router.replace(`/(app)/trips/${res.trip._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Post a trip">
      <View style={styles.header}>
        <Muted>Step 4 of 4 — Review &amp; publish</Muted>
      </View>

      <Card>
        <SectionTitle>
          {draft.fromCity || draft.fromPoint.address} → {draft.toCity || draft.toPoint.address}
        </SectionTitle>
        <Muted>Departs {formatDate(draft.departureAt)}</Muted>
        <View style={styles.rowBetween}>
          <Muted>Truck</Muted>
          <Body>{draft.truckRegNumber}</Body>
        </View>
        <View style={styles.rowBetween}>
          <Muted>Capacity</Muted>
          <Body>
            {formatTons(draft.availableCapacity)} of {formatTons(draft.totalCapacity)}
          </Body>
        </View>
        <View style={styles.rowBetween}>
          <Muted>Price</Muted>
          <Body>{formatINR(draft.pricePerTon)}/ton</Body>
        </View>
        <Muted>Pickup: {draft.pickupPoint.address}</Muted>
        {cleanStops(draft.stops).length > 0 && (
          <Muted>Via: {cleanStops(draft.stops).map((stop) => stop.address).join(" → ")}</Muted>
        )}
        <Muted>Drop: {draft.dropPoint.address}</Muted>
      </Card>

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <View style={styles.row}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Button title="Publish trip" onPress={handlePublish} loading={submitting} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  error: { color: theme.color.danger },
});

export default PostTripReviewScreen;
