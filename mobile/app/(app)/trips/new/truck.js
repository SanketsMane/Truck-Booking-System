import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
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

// One driver = one active truck — there's at most one selectable truck, so
// this step just confirms it rather than offering a picker (mirrors the
// web PostTrip.jsx's own post-MVP-rework simplification of this step).
export const PostTripTruckScreen = () => {
  const router = useRouter();
  const { updateDraft } = usePostTripDraft();
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyTrucks()
      .then((res) => {
        const active = (res.trucks || []).find((t) => t.lifecycle === "active") || null;
        setTruck(active);
        if (active) updateDraft({ truckId: active._id, truckRegNumber: active.regNumber, truckCapacity: active.totalCapacity });
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

      {!truck ? (
        <EmptyState>
          <Body>Your truck isn’t active yet — it needs to pass verification before you can post a trip.</Body>
          <Link href="/(app)/trucks" asChild>
            <Button title="Check verification status" variant="secondary" />
          </Link>
        </EmptyState>
      ) : (
        <Card>
          <Body>{truck.regNumber}</Body>
          <Muted>
            {truck.truckType} · {formatTons(truck.totalCapacity)}
          </Muted>
          <StatusBadge status={truck.status} />
        </Card>
      )}

      <View style={styles.row}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Button title="Next: capacity" onPress={() => router.push("/(app)/trips/new/capacity")} disabled={!truck} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  row: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
});

export default PostTripTruckScreen;
