import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body, BodyStrong, Overline, Caption } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { Card, Section } from "../../src/components/ui/Card";
import { PressableRow } from "../../src/components/ui/PressableRow";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { ErrorState } from "../../src/components/ui/ErrorState";
import { LocationField } from "../../src/components/LocationField";
import { DateField } from "../../src/components/ui/DateField";
import { theme } from "../../src/theme";
import { getPopularRoutes } from "../../src/api/trips";
import { useAuth } from "../../src/context/AuthContext";

// Home has exactly one job: start a search. Everything else on it is a
// shortcut to that same job, so the search panel is the only raised surface
// and the only primary button on the screen.
//
// The previous version inverted its own hierarchy — the wordmark was the
// loudest element (26pt bold) while the tappable popular-route rows were the
// quietest (13.5pt grey, no pressed state, ~38dp tall). The thing you look at
// should not outrank the thing you press.
export const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [fromPoint, setFromPoint] = useState({ address: "", lat: null, lng: null });
  const [toPoint, setToPoint] = useState({ address: "", lat: null, lng: null });
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(new Date());

  const [popularRoutes, setPopularRoutes] = useState([]);
  // Four states, not two. `.catch(() => setRoutes([]))` used to turn a failed
  // request into "there are no popular routes" — the user was told a lie and
  // offered no way to recover.
  const [routesStatus, setRoutesStatus] = useState("loading");

  const loadRoutes = useCallback(() => {
    setRoutesStatus("loading");
    getPopularRoutes()
      .then((res) => {
        setPopularRoutes(res.routes || []);
        setRoutesStatus("ready");
      })
      .catch(() => setRoutesStatus("error"));
  }, []);

  useEffect(loadRoutes, [loadRoutes]);

  const from = (fromCity || fromPoint.address).trim();
  const to = (toCity || toPoint.address).trim();
  const canSearch = Boolean(from && to);

  const search = (params) =>
    router.push({ pathname: "/(app)/search-results", params });

  const handleSearch = () => {
    if (!canSearch) return;
    search({
      fromCity: from,
      toCity: to,
      date: date.toISOString().slice(0, 10),
      ...(fromPoint.lat != null ? { fromLat: fromPoint.lat, fromLng: fromPoint.lng } : {}),
      ...(toPoint.lat != null ? { toLat: toPoint.lat, toLng: toPoint.lng } : {}),
    });
  };

  const isTransporter = user?.roles?.includes("transporter");

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>TruckGee</PageTitle>
        <Muted>Ship for less, earn from empty space.</Muted>
      </View>

      {/* The one raised surface on the screen. If everything is raised,
          nothing is — so the search panel gets the lift and every other
          grouping below is spacing-separated instead. */}
      <Card variant="raised" style={styles.searchCard}>
        <LocationField
          label="From"
          value={fromPoint}
          onChange={setFromPoint}
          onResolve={setFromCity}
          placeholder="Pickup city or area"
        />
        <LocationField
          label="To"
          value={toPoint}
          onChange={setToPoint}
          onResolve={setToCity}
          placeholder="Drop city or area"
        />
        <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} />
        <Button
          title="Search trucks"
          size="lg"
          onPress={handleSearch}
          disabled={!canSearch}
          fullWidth
          accessibilityHint={
            canSearch ? "Shows trucks running this route" : "Enter a pickup and drop city first"
          }
        />
        {/* Says WHY the button is disabled. A greyed-out CTA with no
            explanation is the most common dead end in a mobile form. */}
        {!canSearch && <Caption style={styles.hint}>Enter a pickup and drop city to search.</Caption>}
      </Card>

      {isTransporter && (
        <Section>
          <PressableRow
            size="double"
            style={styles.postRow}
            onPress={() => router.push("/(app)/trips/new/route")}
            accessibilityLabel="Post a trip"
            accessibilityHint="List your spare capacity on a route"
          >
            <View style={styles.postIcon}>
              <Ionicons name="add-circle-outline" size={theme.layout.icon.lg} color={theme.color.accent} />
            </View>
            <View style={styles.postText}>
              <BodyStrong>Have spare capacity?</BodyStrong>
              <Muted>Post a trip and get booked on your route.</Muted>
            </View>
            <Ionicons name="chevron-forward" size={theme.layout.icon.md} color={theme.color.textFaint} />
          </PressableRow>
        </Section>
      )}

      <Section title="Popular routes" subtitle="Tap a lane to see trucks running it today">
        {routesStatus === "loading" && (
          <View style={styles.routeSkeletons}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={theme.layout.row.single} radius={theme.radius.control} />
            ))}
          </View>
        )}

        {routesStatus === "error" && (
          <ErrorState
            compact
            title="Couldn't load popular routes"
            message="You can still search any route above."
            onRetry={loadRoutes}
          />
        )}

        {routesStatus === "ready" && popularRoutes.length === 0 && (
          <Muted>No routes yet — search any city pair above to get started.</Muted>
        )}

        {routesStatus === "ready" &&
          popularRoutes.map((r) => (
            <PressableRow
              key={`${r.fromCity}-${r.toCity}`}
              style={styles.routeRow}
              onPress={() =>
                search({
                  fromCity: r.fromCity,
                  toCity: r.toCity,
                  date: new Date().toISOString().slice(0, 10),
                })
              }
              accessibilityLabel={`${r.fromCity} to ${r.toCity}`}
              accessibilityHint="Search trucks on this route"
            >
              <Ionicons name="navigate-outline" size={theme.layout.icon.md} color={theme.color.accent} />
              {/* The route is the content of the row, so it's body weight —
                  not the muted 13.5pt it used to be. A label you can press
                  should never be lighter than the label you can't. */}
              <View style={styles.routeText}>
                <Body numberOfLines={1}>
                  {r.fromCity} <Overline style={styles.arrow}>to</Overline> {r.toCity}
                </Body>
                {r.count > 0 && (
                  <Caption>
                    {r.count} {r.count === 1 ? "truck" : "trucks"} listed
                  </Caption>
                )}
              </View>
              <Ionicons name="chevron-forward" size={theme.layout.icon.md} color={theme.color.textFaint} />
            </PressableRow>
          ))}
      </Section>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.spacing.xs },
  searchCard: { gap: theme.spacing.md },
  hint: { textAlign: "center" },

  postRow: {
    backgroundColor: theme.color.accentSoft,
    borderWidth: theme.layout.hairline,
    borderColor: "transparent",
  },
  postIcon: { alignItems: "center", justifyContent: "center" },
  postText: { flex: 1, gap: theme.spacing.xxs },

  routeSkeletons: { gap: theme.spacing.sm },
  routeRow: {
    backgroundColor: theme.color.surface,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
  },
  routeText: { flex: 1, gap: theme.spacing.xxs },
  arrow: { color: theme.color.textFaint },
});

export default HomeScreen;
