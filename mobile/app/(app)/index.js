import { useEffect, useState } from "react";
import { View, StyleSheet, ImageBackground, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageTitle, Muted, Body, BodyStrong, Caption, Overline } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { PressableRow } from "../../src/components/ui/PressableRow";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { ErrorState } from "../../src/components/ui/ErrorState";
import { LocationField } from "../../src/components/LocationField";
import { DateField } from "../../src/components/ui/DateField";
import { theme } from "../../src/theme";
import { getPopularRoutes } from "../../src/api/trips";
import { useAuth } from "../../src/context/AuthContext";
import heroImage from "../../assets/hero-home.png";

// Home has one job: start a search. Everything else is a shortcut to it.
//
// The previous version was a white form on a grey page — technically correct
// and completely characterless, which is not something a freight app can
// compete on. Three things carry the identity now: a photographic hero that
// says what this app is for before a word is read, a search card that
// OVERLAPS that hero so the screen is one composition with depth rather than
// stacked rectangles, and a from→to rail that reads as a journey instead of
// two unrelated text inputs that happen to sit above each other.
const TRUST = [
  { icon: "shield-checkmark", label: "Verified drivers" },
  { icon: "pricetag", label: "No commission" },
  { icon: "flash", label: "Book direct" },
];

export const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [fromPoint, setFromPoint] = useState({ address: "", lat: null, lng: null });
  const [toPoint, setToPoint] = useState({ address: "", lat: null, lng: null });
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(new Date());

  const [popularRoutes, setPopularRoutes] = useState([]);
  const [routesStatus, setRoutesStatus] = useState("loading");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPopularRoutes()
      .then((res) => {
        if (cancelled) return;
        setPopularRoutes(res.routes || []);
        setRoutesStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setRoutesStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retryRoutes = () => {
    setRoutesStatus("loading");
    setReloadToken((t) => t + 1);
  };

  const from = (fromCity || fromPoint.address).trim();
  const to = (toCity || toPoint.address).trim();
  const canSearch = Boolean(from && to);

  const search = (params) => router.push({ pathname: "/(app)/search-results", params });

  // Return loads are half this business — a driver running Pune→Mumbai today
  // is looking for Mumbai→Pune tomorrow — so swapping is a first-class
  // control rather than something to retype.
  const swap = () => {
    setFromPoint(toPoint);
    setToPoint(fromPoint);
    setFromCity(toCity);
    setToCity(fromCity);
  };

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
  const firstName = user?.name?.split(" ")[0];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground source={heroImage} style={styles.hero} imageStyle={styles.heroImage}>
          {/* A stepped scrim rather than a single flat wash: three bands,
              darkest at the top where the headline sits and clearing toward
              the bottom, so the photograph keeps its golden-hour warmth
              instead of being greyed out uniformly.
              Three Views rather than expo-linear-gradient — this is the only
              gradient in the app, and a dependency (plus a rebuild) to fade
              one header isn't a trade worth making. */}
          {SCRIM_BANDS.map((band) => (
            <View key={band.top} style={[styles.scrim, band]} />
          ))}
          <SafeAreaView edges={["top"]}>
            <View style={styles.heroContent}>
              <Overline style={styles.heroBrand}>TruckGee</Overline>
              <PageTitle style={styles.heroTitle}>
                {firstName ? `Where to, ${firstName}?` : "Where are you\nshipping today?"}
              </PageTitle>

              <View style={styles.trustRow}>
                {TRUST.map((t) => (
                  <View key={t.label} style={styles.trustChip}>
                    <Ionicons name={t.icon} size={theme.layout.icon.xs} color={theme.color.onAccent} />
                    <Caption style={styles.trustText}>{t.label}</Caption>
                  </View>
                ))}
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>

        {/* Pulled up over the hero. This overlap is what turns two stacked
            blocks into one composition with depth. */}
        <View style={styles.searchWrap}>
          <View style={styles.searchCard}>
            {/* From and To share one rail — a dot, a connecting line, a
                square — so the pair reads as a route with a direction. */}
            <View style={styles.railRow}>
              <View style={styles.rail}>
                <View style={styles.railDot} />
                <View style={styles.railLine} />
                <View style={styles.railSquare} />
              </View>

              <View style={styles.railFields}>
                <View style={styles.field}>
                  <Overline>From</Overline>
                  <LocationField
                    value={fromPoint}
                    onChange={setFromPoint}
                    onResolve={setFromCity}
                    placeholder="Pickup city or area"
                  />
                </View>
                <View style={styles.fieldDivider} />
                <View style={styles.field}>
                  <Overline>To</Overline>
                  <LocationField
                    value={toPoint}
                    onChange={setToPoint}
                    onResolve={setToCity}
                    placeholder="Drop city or area"
                  />
                </View>
              </View>

              <Pressable
                onPress={swap}
                style={styles.swap}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Swap pickup and drop"
              >
                <Ionicons name="swap-vertical" size={theme.layout.icon.md} color={theme.color.accent} />
              </Pressable>
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={theme.layout.icon.md} color={theme.color.textFaint} />
              <View style={styles.dateField}>
                <DateField value={date} onChange={setDate} minimumDate={new Date()} />
              </View>
            </View>

            <Button
              title="Search trucks"
              size="lg"
              onPress={handleSearch}
              disabled={!canSearch}
              fullWidth
              accessibilityHint={canSearch ? "Shows trucks running this route" : "Enter a pickup and drop city first"}
            />
            {!canSearch && <Caption style={styles.hint}>Enter a pickup and drop city to search.</Caption>}
          </View>
        </View>

        {isTransporter && (
          <View style={styles.section}>
            <PressableRow
              size="double"
              style={styles.postRow}
              onPress={() => router.push("/(app)/trips/new/route")}
              accessibilityLabel="Post a trip"
              accessibilityHint="List your spare capacity on a route"
            >
              <View style={styles.postIcon}>
                <Ionicons name="add" size={theme.layout.icon.md} color={theme.color.onAccent} />
              </View>
              <View style={styles.postText}>
                <BodyStrong>Running empty?</BodyStrong>
                <Muted>Post your route and get booked.</Muted>
              </View>
              <Ionicons name="chevron-forward" size={theme.layout.icon.md} color={theme.color.textFaint} />
            </PressableRow>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <BodyStrong>Popular routes</BodyStrong>
            <Caption>Tap to see trucks running it</Caption>
          </View>

          {routesStatus === "loading" && (
            <View style={styles.routeList}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={theme.layout.row.single} radius={theme.radius.card} />
              ))}
            </View>
          )}

          {routesStatus === "error" && (
            <ErrorState
              compact
              title="Couldn't load popular routes"
              message="You can still search any route above."
              onRetry={retryRoutes}
            />
          )}

          {routesStatus === "ready" && popularRoutes.length === 0 && (
            <Muted>No routes yet — search any city pair above to get started.</Muted>
          )}

          {routesStatus === "ready" &&
            popularRoutes.length > 0 && (
              <View style={styles.routeList}>
                {popularRoutes.map((r) => (
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
                    <View style={styles.routeIcon}>
                      <Ionicons name="navigate" size={theme.layout.icon.sm} color={theme.color.accent} />
                    </View>
                    <View style={styles.routeText}>
                      <Body numberOfLines={1}>
                        {r.fromCity} → {r.toCity}
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
              </View>
            )}
        </View>
      </ScrollView>
    </View>
  );
};

// Tall enough that the brand line, a two-line headline AND the trust chips
// all clear the card that overlaps it. Measured on device: at 260 the chips
// were sliced in half by the card, which is worse than not having them.
// Five bands rather than three: at three the 0.66 → 0.44 step left a seam
// visible across the flat part of the sky. Smaller deltas read as a fade.
const SCRIM_BANDS = [
  { top: "0%", height: "24%", backgroundColor: "rgba(8, 28, 18, 0.62)" },
  { top: "24%", height: "18%", backgroundColor: "rgba(8, 28, 18, 0.54)" },
  { top: "42%", height: "18%", backgroundColor: "rgba(8, 28, 18, 0.44)" },
  { top: "60%", height: "20%", backgroundColor: "rgba(8, 28, 18, 0.34)" },
  { top: "80%", height: "20%", backgroundColor: "rgba(8, 28, 18, 0.24)" },
];

const HERO_HEIGHT = 340;
const CARD_OVERLAP = 72;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  scroll: { paddingBottom: theme.spacing.xxl },

  hero: {
    height: HERO_HEIGHT,
    justifyContent: "flex-start",
    // Shows through only until the photo decodes, so the hero never flashes
    // white on a cold start.
    backgroundColor: theme.color.accentStrong,
  },
  heroImage: { resizeMode: "cover" },

  // The sun sits in the top-left of this photograph — exactly where the
  // headline goes — so the top band has to carry real weight. Measured
  // against the brightest part of the image, not the average.
  scrim: { position: "absolute", left: 0, right: 0 },
  heroContent: {
    paddingHorizontal: theme.spacing.md,
    // Clears the status bar; the title was crowding it.
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  heroBrand: { color: "rgba(255, 255, 255, 0.72)" },
  heroTitle: { color: theme.color.onAccent },

  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  trustText: { color: theme.color.onAccent },

  searchWrap: { paddingHorizontal: theme.spacing.md, marginTop: -CARD_OVERLAP },
  searchCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.smd,
    ...theme.elevation[3],
  },

  railRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.smd },
  rail: { alignItems: "center", paddingVertical: theme.spacing.md },
  railDot: { width: 9, height: 9, borderRadius: theme.radius.pill, backgroundColor: theme.color.accent },
  railLine: { width: 2, flex: 1, minHeight: theme.spacing.xxl, backgroundColor: theme.color.border, marginVertical: 4 },
  railSquare: { width: 9, height: 9, borderRadius: 2, backgroundColor: theme.color.text },
  railFields: { flex: 1 },
  field: { gap: theme.spacing.xxs, paddingVertical: theme.spacing.sm },
  fieldDivider: { height: theme.layout.hairline, backgroundColor: theme.color.border },
  swap: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accentSoft,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.smd,
    borderTopWidth: theme.layout.hairline,
    borderTopColor: theme.color.border,
    paddingTop: theme.spacing.smd,
  },
  dateField: { flex: 1 },
  hint: { textAlign: "center" },

  section: { paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.lg, gap: theme.spacing.smd },
  sectionHead: { gap: theme.spacing.xxs },

  postRow: {
    backgroundColor: theme.color.surface,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
    ...theme.elevation[1],
  },
  postIcon: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accent,
  },
  postText: { flex: 1, gap: theme.spacing.xxs },

  routeList: { gap: theme.spacing.sm },
  routeRow: {
    backgroundColor: theme.color.surface,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
  },
  routeIcon: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accentSoft,
  },
  routeText: { flex: 1, gap: theme.spacing.xxs },
});

export default HomeScreen;
