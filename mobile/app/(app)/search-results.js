import { useEffect, useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body } from "../../src/components/ui/Typography";
import { Card } from "../../src/components/ui/Card";
import { StatusBadge } from "../../src/components/ui/Badge";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { theme } from "../../src/theme";
import { searchTrips } from "../../src/api/trips";
import { formatINR, formatTons, formatDate } from "../../src/utils/format";

export const SearchResultsScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      searchTrips({
        fromCity: params.fromCity,
        toCity: params.toCity,
        date: params.date,
        fromLat: params.fromLat,
        fromLng: params.fromLng,
        toLat: params.toLat,
        toLng: params.toLng,
      })
        .then((res) => setTrips(res.trips || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [params.fromCity, params.toCity, params.date, params.fromLat, params.fromLng, params.toLat, params.toLng]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <PageTitle>
          {params.fromCity} → {params.toCity}
        </PageTitle>
        <Muted>{formatDate(params.date)}</Muted>
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : trips.length === 0 ? (
        <EmptyState>No matching trips yet. Try a different date, or save a search alert from the web app.</EmptyState>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/trips/${item._id}`)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Body>
                    {item.fromCity} → {item.toCity}
                  </Body>
                  {item.matchType === "route" && <StatusBadge status="info">On route</StatusBadge>}
                </View>
                <Muted>
                  {item.truck?.regNumber} · {item.truck?.truckType}
                </Muted>
                <View style={styles.rowBetween}>
                  <Muted>{formatTons(item.availableCapacity)} available</Muted>
                  <Body>{formatINR(item.pricePerTon)}/ton</Body>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4, padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default SearchResultsScreen;
