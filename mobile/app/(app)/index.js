import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { LocationField } from "../../src/components/LocationField";
import { DateField } from "../../src/components/ui/DateField";
import { theme } from "../../src/theme";
import { getPopularRoutes } from "../../src/api/trips";
import { useAuth } from "../../src/context/AuthContext";

// Mirrors frontend/src/pages/Home.jsx's search form — from/to (address-
// level, city extracted via LocationField's onResolve), a departure date,
// and a "popular routes" quick-pick list, all funneling into
// /search-results with the resolved query params.
export const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [fromPoint, setFromPoint] = useState({ address: "", lat: null, lng: null });
  const [toPoint, setToPoint] = useState({ address: "", lat: null, lng: null });
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(new Date());
  const [popularRoutes, setPopularRoutes] = useState([]);

  useEffect(() => {
    getPopularRoutes()
      .then((res) => setPopularRoutes(res.routes || []))
      .catch(() => setPopularRoutes([]));
  }, []);

  const handleSearch = () => {
    const from = (fromCity || fromPoint.address).trim();
    const to = (toCity || toPoint.address).trim();
    if (!from || !to) return;
    router.push({
      pathname: "/(app)/search-results",
      params: {
        fromCity: from,
        toCity: to,
        date: date.toISOString().slice(0, 10),
        ...(fromPoint.lat != null ? { fromLat: fromPoint.lat, fromLng: fromPoint.lng } : {}),
        ...(toPoint.lat != null ? { toLat: toPoint.lat, toLng: toPoint.lng } : {}),
      },
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>TruckGee</PageTitle>
        <Muted>Ship for less, earn from empty space.</Muted>
      </View>

      <Card>
        <LocationField label="From" value={fromPoint} onChange={setFromPoint} onResolve={setFromCity} placeholder="Pickup city or area" />
        <LocationField label="To" value={toPoint} onChange={setToPoint} onResolve={setToCity} placeholder="Drop city or area" />
        <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} />
        <Button title="Search trucks" onPress={handleSearch} fullWidth />
      </Card>

      {user?.roles?.includes("transporter") && (
        <Card>
          <Body>Have spare capacity?</Body>
          <Button title="Post a trip" variant="secondary" onPress={() => router.push("/(app)/trips/new/route")} fullWidth />
        </Card>
      )}

      {popularRoutes.length > 0 && (
        <View style={styles.popular}>
          <Body>Popular routes</Body>
          {popularRoutes.map((r, i) => (
            <Pressable
              key={i}
              style={styles.popularRow}
              onPress={() =>
                router.push({
                  pathname: "/(app)/search-results",
                  params: { fromCity: r.fromCity, toCity: r.toCity, date: new Date().toISOString().slice(0, 10) },
                })
              }
            >
              <Muted>
                {r.fromCity} → {r.toCity}
              </Muted>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  popular: { gap: theme.space(2) },
  popularRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
  },
});

export default HomeScreen;
