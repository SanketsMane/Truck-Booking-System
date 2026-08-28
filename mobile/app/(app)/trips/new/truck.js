import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { PageTitle, Muted, Body } from "../../../../src/components/ui/Typography";
import { Card } from "../../../../src/components/ui/Card";
import { Button } from "../../../../src/components/ui/Button";
import { StatusBadge } from "../../../../src/components/ui/Badge";
import { EmptyState } from "../../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../../src/components/ui/LoadingView";
import { listMyTrucks } from "../../../../src/api/trucks";
import { formatTons } from "../../../../src/utils/format";
import { usePostTripDraft } from "../../../../src/context/PostTripContext";
import { theme } from "../../../../src/theme";

// Mirrors tripController.postTrip: any verified, non-retired truck the
// transporter owns can carry a trip, so this step is a real picker. With a
// single usable truck it still behaves like a confirmation — auto-selected,
// one tap to move on.
const isUsableTruck = (truck) => truck.status === "verified" && truck.lifecycle !== "inactive";

export const PostTripTruckScreen = () => {
  const router = useRouter();
  const { draft, updateDraft } = usePostTripDraft();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyTrucks()
      .then((res) => {
        const usable = (res.trucks || []).filter(isUsableTruck);
        setTrucks(usable);
        if (usable.length === 1) {
          const only = usable[0];
          updateDraft({ truckId: only._id, truckRegNumber: only.regNumber, truckCapacity: only.totalCapacity });
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>Post a trip</PageTitle>
        <Muted>Step 2 of 4 — Your truck</Muted>
      </View>

      {trucks.length === 0 ? (
        <EmptyState>
          <Body>None of your trucks are verified yet — a truck has to pass verification before you can post a trip on it.</Body>
          <Link href="/(app)/trucks" asChild>
            <Button title="Check verification status" variant="secondary" />
          </Link>
        </EmptyState>
      ) : (
        trucks.map((truck) => (
          <Pressable
            key={truck._id}
            onPress={() =>
              updateDraft({ truckId: truck._id, truckRegNumber: truck.regNumber, truckCapacity: truck.totalCapacity })
            }
          >
            <Card style={draft.truckId === truck._id ? styles.selectedCard : undefined}>
              <Body>{truck.regNumber}</Body>
              <Muted>
                {truck.truckType} · {formatTons(truck.totalCapacity)}
              </Muted>
              <StatusBadge status={truck.status} />
            </Card>
          </Pressable>
        ))
      )}

      <View style={styles.row}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Button
          title="Next: capacity"
          onPress={() => router.push("/(app)/trips/new/capacity")}
          disabled={!draft.truckId}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  row: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  // Only meaningful with more than one truck on screen, but harmless with
  // one — the single usable truck is auto-selected, so it reads as
  // confirmation rather than an unanswered question.
  selectedCard: { borderColor: theme.color.accent, borderWidth: 2 },
});

export default PostTripTruckScreen;
