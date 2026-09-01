import { Pressable, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/theme";

// Filled when active, outline when not. A tab bar that only changes colour
// asks the eye to compare five greens; a filled-vs-outline pair reads at a
// glance, and it still works for someone who can't separate the two colours.
const TAB_ICON = {
  index: ["search", "search-outline"],
  "bookings/index": ["cube", "cube-outline"],
  "trucks/index": ["bus", "bus-outline"],
  "chat/index": ["chatbubbles", "chatbubbles-outline"],
  "profile/index": ["person", "person-outline"],
};

// The default tab button paints an Android ripple — a grey circle that
// spreads out of the tap and lingers. It reads as a stray smudge rather than
// as feedback, especially against a light bar. This replaces it with a brief
// opacity press, which is what iOS does anyway; the real confirmation that a
// tab was pressed is the tab becoming active, which is instant.
const TabButton = ({ children, style, onPress, onLongPress, accessibilityState, accessibilityLabel, testID }) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    accessibilityRole="tab"
    accessibilityState={accessibilityState}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    android_ripple={null}
    style={({ pressed }) => [styles.tabButton, style, pressed && styles.tabButtonPressed]}
  >
    {children}
  </Pressable>
);

const TabItem = ({ routeName, focused }) => {
  const [filled, outline] = TAB_ICON[routeName] || ["ellipse", "ellipse-outline"];
  return (
    <View style={styles.item}>
      {/* A short bar above the active tab. Colour alone is doing a lot of
          work in a five-item bar; a position marker makes "where am I" a
          shape question rather than a hue question. */}
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <Ionicons
        name={focused ? filled : outline}
        size={theme.layout.icon.lg}
        color={focused ? theme.color.accent : theme.color.textFaint}
      />
    </View>
  );
};

export default function AppTabsLayout() {
  // Hardcoding the bottom padding put the "Trucks" label underneath Android's
  // gesture pill — verified on device. The inset is the only number that
  // knows how much room the system actually needs, and it differs between a
  // gesture-nav phone, a 3-button phone and a notched iPhone.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Without this, back goes to the FIRST tab — bottom-tabs defaults
      // backBehavior to "firstRoute". Since every detail screen in this app is
      // a tab-level route (see the href:null list below), that meant pressing
      // back from edit profile, a trip, a booking or any wizard step dropped
      // you on Home instead of where you came from. "history" follows the
      // order screens were actually visited.
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarButton: TabButton,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textFaint,
        tabBarStyle: [styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom + theme.spacing.sm }],
        tabBarItemStyle: styles.barItem,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ focused }) => <TabItem routeName={route.name} focused={focused} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="bookings/index" options={{ title: "Bookings" }} />
      <Tabs.Screen name="trucks/index" options={{ title: "Trucks" }} />
      <Tabs.Screen name="chat/index" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile/index" options={{ title: "Profile" }} />

      {/* Every other (app) screen — trip detail, post-trip wizard, booking
          detail, verification, support, etc. — is pushed on top of a tab
          from within these screens (via router.push) and shares the tab
          bar's stack rather than getting its own bottom-tab entry. Hiding
          it from the tab bar (not the router) keeps the URL/route usable
          for deep links and back-navigation without cluttering the bar. */}
      <Tabs.Screen name="search-results" options={{ href: null }} />
      <Tabs.Screen name="trips/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="trips/[id]/manage" options={{ href: null }} />
      <Tabs.Screen name="trips/mine" options={{ href: null }} />
      {/* trips/new has its own _layout.js (a Stack wrapping PostTripProvider),
          so to this Tabs navigator the whole wizard is ONE child route named
          "trips/new" — not four. Registering the individual step routes threw
          "No route named trips/new/route" four times over, and because the
          real route was never registered it escaped the href:null treatment
          and rendered as a stray "trips/new" tab in the bar. */}
      <Tabs.Screen name="trips/new" options={{ href: null }} />
      <Tabs.Screen name="bookings/[id]" options={{ href: null }} />
      <Tabs.Screen name="trucks/register" options={{ href: null }} />
      <Tabs.Screen name="trucks/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[threadId]" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/password" options={{ href: null }} />
      <Tabs.Screen name="profile/roles" options={{ href: null }} />
      <Tabs.Screen name="profile/verification/[role]" options={{ href: null }} />
      <Tabs.Screen name="profile/notification-settings" options={{ href: null }} />
      <Tabs.Screen name="profile/devices" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="support/index" options={{ href: null }} />
      <Tabs.Screen name="support/new" options={{ href: null }} />
      <Tabs.Screen name="disputes" options={{ href: null }} />

      {/* Public info/content screens — reachable from Profile's "More"
          section regardless of login state. */}
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="for-shippers" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="faq" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="content/[type]/index" options={{ href: null }} />
      <Tabs.Screen name="content/[type]/[slug]" options={{ href: null }} />
    </Tabs>
  );
}

// Content height; the system inset is added on top of this at runtime.
const BAR_HEIGHT = 60;

const styles = StyleSheet.create({
  bar: {
    paddingTop: theme.spacing.xs,
    backgroundColor: theme.color.surface,
    borderTopWidth: theme.layout.hairline,
    borderTopColor: theme.color.border,
    // The default bar has no elevation, so a white list scrolling underneath
    // it runs straight into a white bar with only a hairline between them.
    ...theme.elevation[2],
  },
  barItem: { paddingVertical: 0 },
  label: { ...theme.text.overline, textTransform: "none", letterSpacing: 0.1 },

  tabButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabButtonPressed: { opacity: 0.6 },

  item: { alignItems: "center", gap: theme.spacing.xxs },
  indicator: {
    width: theme.spacing.lg,
    height: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: "transparent",
  },
  indicatorActive: { backgroundColor: theme.color.accent },
});
