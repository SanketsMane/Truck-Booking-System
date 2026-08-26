import { useCallback, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listMyTrucks } from "../../../src/api/trucks";
import { formatTons } from "../../../src/utils/format";
import { useAuth } from "../../../src/context/AuthContext";
import { AuthRequired } from "../../../src/components/AuthRequired";

// Same one-driver-one-active-truck model as frontend/src/pages/MyTrucks.jsx:
// at most one active truck, at most one candidate (new registration
// awaiting verification, or a Change Vehicle swap in progress), and any
// number of permanently-kept inactive trucks as history.
const TruckRow = ({ truck, onPress }) => (
  <Pressable onPress={onPress} style={styles.truckCard}>
    <Card>
      <View style={styles.rowBetween}>
        <Body>{truck.regNumber}</Body>
        <StatusBadge status={truck.status} />
      </View>
      <Muted>
        {truck.truckType}
        {truck.bodyType ? ` · ${truck.bodyType}` : ""} · {formatTons(truck.totalCapacity)}
      </Muted>
    </Card>
  </Pressable>
);

export const MyTruckScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    listMyTrucks()
      .then((res) => setTrucks(res.trucks || []))
      .catch(() => setTrucks([]))
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return (
      <Screen>
        <AuthRequired title="Log in to manage your truck" body="Register your truck and post trips once you're signed in." />
      </Screen>
    );
  }

  if (loading) return <LoadingView />;

  const activeTruck = trucks.find((t) => t.lifecycle === "active");
  const candidateTruck = trucks.find((t) => t.lifecycle === "candidate");
  const historyTrucks = trucks.filter((t) => t.lifecycle === "inactive");
  const hasBlockingCandidate = Boolean(candidateTruck && candidateTruck.status !== "rejected");

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>My Truck</PageTitle>
        <Muted>Your one active truck, its verification status, and your history.</Muted>
      </View>

      {!activeTruck && !candidateTruck && (
        <EmptyState>You haven’t registered a truck yet.</EmptyState>
      )}

      {activeTruck && (
        <View>
          <SectionTitle style={styles.sectionSpacing}>Active</SectionTitle>
          <TruckRow truck={activeTruck} onPress={() => router.push(`/(app)/trucks/${activeTruck._id}`)} />
        </View>
      )}

      {candidateTruck && (
        <View>
          <SectionTitle style={styles.sectionSpacing}>{activeTruck ? "New truck (Change Vehicle)" : "Awaiting verification"}</SectionTitle>
          <TruckRow truck={candidateTruck} onPress={() => router.push(`/(app)/trucks/${candidateTruck._id}`)} />
        </View>
      )}

      {(!hasBlockingCandidate) && (
        <Button
          title={activeTruck ? "Change Vehicle" : "Register a truck"}
          variant="secondary"
          onPress={() => router.push("/(app)/trucks/register")}
          fullWidth
        />
      )}
      {hasBlockingCandidate && (
        <Muted>Your new truck is awaiting verification — resubmit its documents above if it was rejected.</Muted>
      )}

      {historyTrucks.length > 0 && (
        <View>
          <SectionTitle style={styles.sectionSpacing}>Truck history</SectionTitle>
          {historyTrucks.map((t) => (
            <TruckRow key={t._id} truck={t} onPress={() => router.push(`/(app)/trucks/${t._id}`)} />
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  sectionSpacing: { marginBottom: theme.space(2) },
  truckCard: { marginBottom: theme.space(2) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default MyTruckScreen;
