import { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body, BodyStrong, Caption, Label, Amount } from "../../src/components/ui/Typography";
import { Card } from "../../src/components/ui/Card";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { SkeletonList } from "../../src/components/ui/Skeleton";
import { ErrorState } from "../../src/components/ui/ErrorState";
import { PressableRow } from "../../src/components/ui/PressableRow";
import { EmptyIllustration } from "../../src/components/ui/EmptyIllustration";
import { TruckImage } from "../../src/components/TruckImage";
import { theme } from "../../src/theme";
import { searchTrips } from "../../src/api/trips";
import { formatINR, formatTons, formatDate, formatTime, ratingLabel } from "../../src/utils/format";

// A results list is a comparison screen: the shipper is deciding between
// options, so the two fields that drive the decision — when it leaves and
// what it costs — get the visual weight, and everything else supports them.
// Previously every field on the card was Body or Muted, so the price carried
// no more emphasis than the truck's registration number and the eye had
// nowhere to land.

const MATCH_LABEL = {
  // The transporter typed these stops in themselves, so it's a stronger claim
  // than a corridor match the backend inferred from coordinates. Worth
  // wording differently rather than showing one generic "nearby" badge.
  stop: "Stops on your route",
  route: "Passes your route",
};

const ResultCard = ({ trip, onPress }) => {
  // visibleAvailableCapacity accounts for capacity already held by other
  // shippers' pending requests; availableCapacity does not. Showing the raw
  // number would advertise tonnage that may already be spoken for.
  const capacity = trip.visibleAvailableCapacity ?? trip.availableCapacity;
  const matchLabel = MATCH_LABEL[trip.matchType];

  return (
    <PressableRow
      onPress={onPress}
      style={styles.cardPress}
      contentStyle={styles.cardContent}
      accessibilityLabel={`${trip.fromCity} to ${trip.toCity}, departing ${formatTime(trip.departureAt)}, ${formatINR(trip.pricePerTon)} per ton`}
      accessibilityHint="Opens the trip to book capacity"
    >
      <Card variant="flat" style={styles.card}>
        {/* Departure and price on one line: the two numbers being compared
            down the list, aligned so the eye can scan a column of each. */}
        <View style={styles.topRow}>
          <View style={styles.departure}>
            <BodyStrong>{formatTime(trip.departureAt)}</BodyStrong>
            <Caption>{formatDate(trip.departureAt)}</Caption>
          </View>
          <View style={styles.priceCol}>
            <Amount size="md" tone="default">
              {formatINR(trip.pricePerTon)}
            </Amount>
            <Caption>per ton</Caption>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.routeRow}>
          <Ionicons name="navigate-outline" size={theme.layout.icon.sm} color={theme.color.accent} />
          <Body style={styles.routeText} numberOfLines={1}>
            {trip.fromCity} → {trip.toCity}
          </Body>
          {matchLabel ? <StatusBadge status="info">{matchLabel}</StatusBadge> : null}
        </View>

        {trip.stops?.length > 0 && (
          <Caption numberOfLines={1}>via {trip.stops.map((s) => s.address).join(" → ")}</Caption>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            {/* The vehicle itself, not a generic box icon — body type is the
                thing a shipper is actually shortlisting on. */}
            <TruckImage bodyType={trip.truck?.bodyType} size={52} />
            <Muted numberOfLines={1}>
              {trip.truck?.truckType}
              {trip.truck?.bodyType ? ` · ${trip.truck.bodyType}` : ""}
            </Muted>
          </View>
          <Label>{formatTons(capacity)} free</Label>
        </View>

        {/* Who is actually carrying the load. This was missing entirely — the
            API has always returned the transporter's name and rating, and it's
            the trust signal a shipper weighs before committing a shipment. */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-circle-outline" size={theme.layout.icon.md} color={theme.color.textFaint} />
            <Muted numberOfLines={1}>{trip.transporter?.name || "Transporter"}</Muted>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={theme.layout.icon.xs} color={theme.color.warning} />
            <Label>{ratingLabel(trip.transporter?.ratingAvg, trip.transporter?.ratingCount)}</Label>
          </View>
        </View>
      </Card>
    </PressableRow>
  );
};

export const SearchResultsScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const { fromCity, toCity, date, fromLat, fromLng, toLat, toLng } = params;

  useEffect(() => {
    let cancelled = false;
    searchTrips({ fromCity, toCity, date, fromLat, fromLng, toLat, toLng })
      .then((res) => {
        if (cancelled) return;
        setTrips(res.trips || []);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [fromCity, toCity, date, fromLat, fromLng, toLat, toLng, reloadToken]);

  const retry = () => {
    setError("");
    setStatus("loading");
    setReloadToken((t) => t + 1);
  };

  const header = (
    <View style={styles.header}>
      <PageTitle numberOfLines={2}>
        {fromCity} → {toCity}
      </PageTitle>
      <Muted>
        {formatDate(date)}
        {/* The count is the first thing a shipper wants after searching —
            "is there anything here at all?" — so it sits in the header
            rather than being inferred from scrolling. */}
        {status === "ready" ? ` · ${trips.length} ${trips.length === 1 ? "truck" : "trucks"}` : ""}
      </Muted>
    </View>
  );

  if (status === "loading") {
    return (
      <Screen title="">
        {header}
        <SkeletonList count={4} />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen title="">
        {header}
        <ErrorState title="Couldn't load results" message={error} onRetry={retry} />
      </Screen>
    );
  }

  if (trips.length === 0) {
    return (
      <Screen title="">
        {header}
        {/* The old copy told a mobile user to "save a search alert from the
            web app" — sending someone out of the app they're already in. */}
        <EmptyIllustration
          art="search"
          title="No trucks on this route yet"
          message={`Nobody has posted capacity for this lane on ${formatDate(date)}. Try a nearby date, or search a different route.`}
          action={<Button title="Change search" variant="secondary" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} title="">
      <FlatList
        data={trips}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ResultCard trip={item} onPress={() => router.push(`/(app)/trips/${item._id}`)} />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs, paddingBottom: theme.spacing.smd },
  list: { padding: theme.spacing.md, gap: theme.spacing.smd },

  // PressableRow supplies the touch target and press feedback; the Card is
  // purely the surface, so the row's own padding is zeroed to avoid doubling
  // it up with the card's.
  cardPress: { borderRadius: theme.radius.card },
  cardContent: { padding: 0, gap: 0 },
  card: { flex: 1, gap: theme.spacing.sm },

  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  departure: { gap: theme.spacing.xxs },
  priceCol: { alignItems: "flex-end", gap: theme.spacing.xxs },

  divider: { height: theme.layout.hairline, backgroundColor: theme.color.border },

  routeRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  routeText: { flex: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexShrink: 1 },

});

export default SearchResultsScreen;
