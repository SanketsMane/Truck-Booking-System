import { useCallback, useState } from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, BodyStrong, Muted, Caption, Amount } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { PressableRow } from "../../../src/components/ui/PressableRow";
import { SkeletonList } from "../../../src/components/ui/Skeleton";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { theme } from "../../../src/theme";
import { listMyTrips } from "../../../src/api/trips";
import { formatINR, formatTons, formatDate, formatTime } from "../../../src/utils/format";

// How much of the posted capacity is actually sold. A transporter's first
// question about their own trip is "is this filling up?", and a bare
// "12 T of 20 T available" makes them do the arithmetic to find out.
const CapacityBar = ({ available, total }) => {
  const sold = Math.max(0, (total || 0) - (available || 0));
  const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
  return (
    <View style={styles.capacityWrap}>
      <View style={styles.capacityRow}>
        <Caption>
          {formatTons(sold)} booked of {formatTons(total)}
        </Caption>
        <Caption>{pct}% full</Caption>
      </View>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${pct} percent booked`}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
};

const TripRow = ({ trip, onPress }) => (
  <PressableRow
    onPress={onPress}
    style={styles.rowPress}
    contentStyle={styles.rowContent}
    accessibilityLabel={`${trip.fromCity} to ${trip.toCity}, ${trip.status}`}
    accessibilityHint="Opens the trip to manage it"
  >
    <Card variant="flat" style={styles.card}>
      <View style={styles.topRow}>
        <Body style={styles.route} numberOfLines={1}>
          {trip.fromCity} → {trip.toCity}
        </Body>
        <StatusBadge status={trip.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={theme.layout.icon.sm} color={theme.color.textFaint} />
          <Caption>
            {formatDate(trip.departureAt)} · {formatTime(trip.departureAt)}
          </Caption>
        </View>
        <Amount size="xs">{formatINR(trip.pricePerTon)}/T</Amount>
      </View>

      {trip.stops?.length > 0 && (
        <Caption numberOfLines={1}>via {trip.stops.map((s) => s.address).join(" → ")}</Caption>
      )}

      <CapacityBar available={trip.availableCapacity} total={trip.totalCapacity} />
    </Card>
  </PressableRow>
);

export const MyTripsScreen = () => {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(({ isRefresh } = {}) => {
    if (!isRefresh) setStatus("loading");
    listMyTrips()
      .then((res) => {
        setTrips(res.trips || []);
        setStatus("ready");
      })
      // Was `.catch(() => setTrips([]))`, which showed a transporter
      // "you haven't posted any trips yet" when their trips were simply
      // unreachable — alarming, and with no way to retry.
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      })
      .finally(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load({ isRefresh: true });
  };

  const live = trips.filter((t) => ["published", "full"].includes(t.status)).length;

  const header = (
    <View style={styles.header}>
      <PageTitle>My Trips</PageTitle>
      {status === "ready" && trips.length > 0 && (
        <Muted>
          {trips.length} {trips.length === 1 ? "trip" : "trips"}
          {live > 0 ? ` · ${live} live` : ""}
        </Muted>
      )}
    </View>
  );

  if (status === "loading") {
    return (
      <Screen>
        {header}
        <SkeletonList count={4} />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen>
        {header}
        <ErrorState title="Couldn't load your trips" message={error} onRetry={load} />
      </Screen>
    );
  }

  if (trips.length === 0) {
    return (
      <Screen>
        {header}
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="navigate-outline" size={theme.layout.icon.xl} color={theme.color.textFaint} />
          </View>
          <BodyStrong>No trips posted yet</BodyStrong>
          <Muted style={styles.emptyText}>
            Post the routes you&apos;re already running and let shippers book your spare capacity.
          </Muted>
          <Button title="Post a trip" onPress={() => router.push("/(app)/trips/new/route")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.accent} />
        }
        renderItem={({ item }) => (
          <TripRow trip={item} onPress={() => router.push(`/(app)/trips/${item._id}/manage`)} />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, paddingBottom: theme.spacing.smd },
  list: { padding: theme.spacing.md, gap: theme.spacing.smd },

  rowPress: { borderRadius: theme.radius.card },
  rowContent: { padding: 0, gap: 0 },
  card: { flex: 1, gap: theme.spacing.sm },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  route: { flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexShrink: 1 },

  capacityWrap: { gap: theme.spacing.xs },
  capacityRow: { flexDirection: "row", justifyContent: "space-between" },
  track: {
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceRaised,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.color.accent },

  empty: { alignItems: "center", gap: theme.spacing.smd, paddingVertical: theme.spacing.xxl },
  emptyIcon: {
    width: theme.spacing.giant,
    height: theme.spacing.giant,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surfaceRaised,
  },
  emptyText: { textAlign: "center" },
});

export default MyTripsScreen;
