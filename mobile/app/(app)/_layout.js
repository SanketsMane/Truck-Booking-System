import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/theme";

const TAB_ICON = {
  index: "search",
  "bookings/index": "briefcase",
  "trucks/index": "car",
  "chat/index": "chatbubbles",
  "profile/index": "person",
};

export default function AppTabsLayout() {
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
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textFaint,
        tabBarStyle: { borderTopColor: theme.color.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICON[route.name] || "ellipse"} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="bookings/index" options={{ title: "Bookings" }} />
      <Tabs.Screen name="trucks/index" options={{ title: "My Truck" }} />
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
