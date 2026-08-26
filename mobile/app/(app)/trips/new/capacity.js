import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../../../src/components/ui/Typography";
import { TextField } from "../../../../src/components/ui/TextField";
import { LocationField } from "../../../../src/components/LocationField";
import { Button } from "../../../../src/components/ui/Button";
import { usePostTripDraft } from "../../../../src/context/PostTripContext";

export const PostTripCapacityScreen = () => {
  const router = useRouter();
  const { draft, updateDraft } = usePostTripDraft();

  const valid =
    Number(draft.totalCapacity) > 0 &&
    Number(draft.availableCapacity) > 0 &&
    Number(draft.availableCapacity) <= Number(draft.totalCapacity) &&
    Number(draft.pricePerTon) > 0 &&
    draft.pickupPoint.address.trim() &&
    draft.dropPoint.address.trim();

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>Post a trip</PageTitle>
        <Muted>Step 3 of 4 — Capacity &amp; price</Muted>
      </View>

      <TextField label="Total capacity (tons)" value={draft.totalCapacity} onChangeText={(v) => updateDraft({ totalCapacity: v })} keyboardType="numeric" />
      <TextField label="Available to sell (tons)" value={draft.availableCapacity} onChangeText={(v) => updateDraft({ availableCapacity: v })} keyboardType="numeric" />
      <TextField label="Price per ton (₹)" value={draft.pricePerTon} onChangeText={(v) => updateDraft({ pricePerTon: v })} keyboardType="numeric" />
      <LocationField label="Pickup point" value={draft.pickupPoint} onChange={(pickupPoint) => updateDraft({ pickupPoint })} placeholder="Exact pickup address" />
      <LocationField label="Drop point" value={draft.dropPoint} onChange={(dropPoint) => updateDraft({ dropPoint })} placeholder="Exact drop address" />

      <View style={styles.row}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Button title="Next: review" onPress={() => router.push("/(app)/trips/new/review")} disabled={!valid} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  row: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
});

export default PostTripCapacityScreen;
