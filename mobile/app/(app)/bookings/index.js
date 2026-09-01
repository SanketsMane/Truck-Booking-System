import { useCallback, useState } from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, BodyStrong, Muted, Caption, Amount } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { SegmentedControl } from "../../../src/components/ui/SegmentedControl";
import { PressableRow } from "../../../src/components/ui/PressableRow";
import { SkeletonList } from "../../../src/components/ui/Skeleton";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { EmptyIllustration } from "../../../src/components/ui/EmptyIllustration";
import { theme } from "../../../src/theme";
import { listMyBookings } from "../../../src/api/bookings";
import { formatINR, formatTons, formatDate } from "../../../src/utils/format";
import { useAuth } from "../../../src/context/AuthContext";
import { AuthRequired } from "../../../src/components/AuthRequired";

// A booking that needs the user to do something should not look identical to
// one that's finished. These are the states where the counterparty is waiting
// on them, so the row gets a marker.
const NEEDS_ATTENTION = new Set(["pending", "confirmed", "ongoing"]);

const BookingRow = ({ booking, role, onPress }) => {
  const trip = booking.trip;
  // Whose name to show depends on which side you're looking from: a shipper
  // wants to know who's carrying it, a transporter who's shipping.
  const counterparty =
    role === "shipper" ? trip?.transporter?.name : booking.shipper?.name;

  return (
    <PressableRow
      onPress={onPress}
      style={styles.rowPress}
      contentStyle={styles.rowContent}
      accessibilityLabel={`${trip?.fromCity} to ${trip?.toCity}, ${booking.status}`}
      accessibilityHint="Opens the booking"
    >
      <Card variant="flat" style={styles.card}>
        <View style={styles.topRow}>
          <Body style={styles.route} numberOfLines={1}>
            {trip?.fromCity} → {trip?.toCity}
          </Body>
          <StatusBadge status={booking.status} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={theme.layout.icon.sm} color={theme.color.textFaint} />
            <Caption>{formatDate(trip?.departureAt)}</Caption>
          </View>
          {counterparty ? (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={theme.layout.icon.sm} color={theme.color.textFaint} />
              <Caption numberOfLines={1}>{counterparty}</Caption>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View>
            <Caption>Booked</Caption>
            <BodyStrong>{formatTons(booking.capacityRequested)}</BodyStrong>
          </View>
          <View style={styles.priceCol}>
            <Caption>Estimate</Caption>
            <Amount size="sm">{formatINR(booking.priceEstimate)}</Amount>
          </View>
        </View>
      </Card>
    </PressableRow>
  );
};

export const MyBookingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const hasBothRoles = user?.roles?.includes("shipper") && user?.roles?.includes("transporter");
  const [role, setRole] = useState(user?.roles?.includes("shipper") ? "shipper" : "transporter");

  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    ({ isRefresh } = {}) => {
      if (!user) return;
      if (!isRefresh) setStatus("loading");
      listMyBookings({ role })
        .then((res) => {
          setBookings(res.bookings || []);
          setStatus("ready");
        })
        // Previously `.catch(() => setBookings([]))` — a failed request
        // rendered as "No bookings yet", telling the user their bookings
        // don't exist when in fact the app couldn't reach the server.
        .catch((err) => {
          setError(err.message);
          setStatus("error");
        })
        .finally(() => setRefreshing(false));
    },
    [role, user]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load({ isRefresh: true });
  };

  const attention = bookings.filter((b) => NEEDS_ATTENTION.has(b.status)).length;

  const header = (
    <View style={styles.header}>
      <PageTitle>My Bookings</PageTitle>
      {hasBothRoles && (
        <SegmentedControl
          value={role}
          onChange={setRole}
          segments={[
            { value: "shipper", label: "As shipper" },
            { value: "transporter", label: "As transporter" },
          ]}
        />
      )}
      {status === "ready" && bookings.length > 0 && (
        <Muted>
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
          {attention > 0 ? ` · ${attention} active` : ""}
        </Muted>
      )}
    </View>
  );

  const body = () => {
    if (status === "loading") return <SkeletonList count={4} />;
    if (status === "error") {
      return <ErrorState title="Couldn't load your bookings" message={error} onRetry={load} />;
    }
    if (bookings.length === 0) {
      return (
        <EmptyIllustration
          art="bookings"
          title="No bookings yet"
          message={
            role === "shipper"
              ? "Search a route and request capacity — your bookings will show up here."
              : "Bookings appear here once shippers request capacity on your posted trips."
          }
          action={
            <Button
              title={role === "shipper" ? "Find a truck" : "Post a trip"}
              variant="secondary"
              onPress={() => router.push(role === "shipper" ? "/(app)" : "/(app)/trips/new/route")}
            />
          }
        />
      );
    }
    return null;
  };

  const listBody = body();

  return (
    <Screen scroll={false}>
      <AuthRequired
        title="Log in to see your bookings"
        body="Track requests and manage shipments once you're signed in."
      >
        {listBody ? (
          <View style={styles.staticWrap}>
            {header}
            {listBody}
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={header}
            contentContainerStyle={styles.list}
            refreshControl={
              // Pull-to-refresh is the gesture people already try on a list
              // of their own pending things; without it the only way to see a
              // status change was to leave the screen and come back.
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.accent} />
            }
            renderItem={({ item }) => (
              <BookingRow
                booking={item}
                role={role}
                onPress={() => router.push(`/(app)/bookings/${item._id}`)}
              />
            )}
          />
        )}
      </AuthRequired>
    </Screen>
  );
};

const styles = StyleSheet.create({
  staticWrap: { padding: theme.spacing.md, gap: theme.spacing.md, flex: 1 },
  header: { gap: theme.spacing.smd, paddingBottom: theme.spacing.smd },
  list: { padding: theme.spacing.md, gap: theme.spacing.smd },

  rowPress: { borderRadius: theme.radius.card },
  rowContent: { padding: 0, gap: 0 },
  card: { flex: 1, gap: theme.spacing.sm },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  route: { flex: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexShrink: 1 },

  divider: { height: theme.layout.hairline, backgroundColor: theme.color.border },
  bottomRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  priceCol: { alignItems: "flex-end" },

});

export default MyBookingsScreen;
