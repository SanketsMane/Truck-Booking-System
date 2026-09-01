import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { Muted } from "../../../../src/components/ui/Typography";
import { LocationField } from "../../../../src/components/LocationField";
import { DateField } from "../../../../src/components/ui/DateField";
import { Button } from "../../../../src/components/ui/Button";
import { usePostTripDraft } from "../../../../src/context/PostTripContext";

export const PostTripRouteScreen = () => {
  const router = useRouter();
  const { draft, updateDraft } = usePostTripDraft();

  return (
    <Screen title="Post a trip">
      <View style={styles.header}>
        <Muted>Step 1 of 4 — Route &amp; timing</Muted>
      </View>

      <LocationField
        label="From city"
        value={draft.fromPoint}
        onChange={(fromPoint) => updateDraft({ fromPoint })}
        onResolve={(fromCity) => updateDraft({ fromCity })}
        placeholder="Pickup city or area"
      />
      <LocationField
        label="To city"
        value={draft.toPoint}
        onChange={(toPoint) => updateDraft({ toPoint })}
        onResolve={(toCity) => updateDraft({ toCity })}
        placeholder="Drop city or area"
      />
      <DateField label="Departure date" mode="date" value={draft.departureAt} onChange={(departureAt) => updateDraft({ departureAt })} minimumDate={new Date()} />

      <Button
        title="Next: truck"
        onPress={() => router.push("/(app)/trips/new/truck")}
        disabled={!(draft.fromCity || draft.fromPoint.address) || !(draft.toCity || draft.toPoint.address)}
        fullWidth
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
});

export default PostTripRouteScreen;
