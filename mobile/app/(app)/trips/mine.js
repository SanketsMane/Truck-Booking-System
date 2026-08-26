import { useCallback, useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listMyTrips } from "../../../src/api/trips";
import { formatTons, formatDate } from "../../../src/utils/format";

export const MyTripsScreen = () => {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listMyTrips()
      .then((res) => setTrips(res.trips || []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <PageTitle>My Trips</PageTitle>
      </View>

      {loading ? (
        <LoadingView />
      ) : trips.length === 0 ? (
        <EmptyState>You haven’t posted any trips yet.</EmptyState>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/trips/${item._id}/manage`)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Body>
                    {item.fromCity} → {item.toCity}
                  </Body>
                  <StatusBadge status={item.status} />
                </View>
                <Muted>{formatDate(item.departureAt)}</Muted>
                <Muted>
                  {formatTons(item.availableCapacity)} of {formatTons(item.totalCapacity)} available
                </Muted>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default MyTripsScreen;
