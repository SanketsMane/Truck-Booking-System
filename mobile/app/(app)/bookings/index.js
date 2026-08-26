import { useCallback, useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listMyBookings } from "../../../src/api/bookings";
import { formatINR, formatTons, formatDate } from "../../../src/utils/format";
import { useAuth } from "../../../src/context/AuthContext";
import { AuthRequired } from "../../../src/components/AuthRequired";

export const MyBookingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const hasBothRoles = user?.roles?.includes("shipper") && user?.roles?.includes("transporter");
  const [role, setRole] = useState(user?.roles?.includes("shipper") ? "shipper" : "transporter");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    listMyBookings({ role })
      .then((res) => setBookings(res.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [role, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen scroll={false}>
      <AuthRequired title="Log in to see your bookings" body="Track requests and manage shipments once you're signed in.">
        <View style={styles.header}>
          <PageTitle>My Bookings</PageTitle>
          {hasBothRoles && (
            <View style={styles.roleTabs}>
              <Button title="As Shipper" variant={role === "shipper" ? "primary" : "secondary"} onPress={() => setRole("shipper")} />
              <Button title="As Transporter" variant={role === "transporter" ? "primary" : "secondary"} onPress={() => setRole("transporter")} />
            </View>
          )}
        </View>

        {loading ? (
          <LoadingView />
        ) : bookings.length === 0 ? (
          <EmptyState>No bookings yet.</EmptyState>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/(app)/bookings/${item._id}`)}>
                <Card>
                  <View style={styles.rowBetween}>
                    <Body>
                      {item.trip?.fromCity} → {item.trip?.toCity}
                    </Body>
                    <StatusBadge status={item.status} />
                  </View>
                  <Muted>{formatDate(item.trip?.departureAt)}</Muted>
                  <View style={styles.rowBetween}>
                    <Muted>{formatTons(item.capacityRequested)}</Muted>
                    <Body>{formatINR(item.priceEstimate)}</Body>
                  </View>
                </Card>
              </Pressable>
            )}
          />
        )}
      </AuthRequired>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.space(3), padding: theme.space(4), paddingBottom: 0 },
  roleTabs: { flexDirection: "row", gap: 8 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default MyBookingsScreen;
