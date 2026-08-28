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

  // A transporter runs a fleet now, not one nominated vehicle — anything
  // verified and not retired can take a trip. Verified first, so the trucks
  // that can actually work today sit at the top.
  const fleetTrucks = trucks
    .filter((t) => t.lifecycle !== "inactive")
    .sort((a, b) => Number(b.status === "verified") - Number(a.status === "verified"));
  const historyTrucks = trucks.filter((t) => t.lifecycle === "inactive");
  const readyCount = fleetTrucks.filter((t) => t.status === "verified").length;

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>My Trucks</PageTitle>
        <Muted>
          {readyCount > 0
            ? `${readyCount} truck${readyCount === 1 ? "" : "s"} ready to take trips.`
            : "Register the vehicles you run — each one can take trips once it's verified."}
        </Muted>
      </View>

      {fleetTrucks.length === 0 && <EmptyState>You haven’t registered a truck yet.</EmptyState>}

      {fleetTrucks.length > 0 && (
        <View>
          <SectionTitle style={styles.sectionSpacing}>In service</SectionTitle>
          {fleetTrucks.map((t) => (
            <TruckRow key={t._id} truck={t} onPress={() => router.push(`/(app)/trucks/${t._id}`)} />
          ))}
        </View>
      )}

      <Button
        title={fleetTrucks.length > 0 ? "Add another truck" : "Register a truck"}
        variant="secondary"
        onPress={() => router.push("/(app)/trucks/register")}
        fullWidth
      />

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
