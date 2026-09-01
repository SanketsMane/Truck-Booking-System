import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { theme } from "../../src/theme";
import { TabBarItem } from "../../src/components/ui/TabBarItem";

// Which destination each tab route maps to. The active one is decided by
// expo-router's own `focused` flag — i.e. by the real navigation state — not
// by anything this file tracks itself, so it can never drift out of sync with
// the back stack.
const TAB_LABEL = {
  index: "Home",
  "bookings/index": "Bookings",
  "trucks/index": "Trucks",
  "chat/index": "Chat",
  "profile/index": "Profile",
};

const TAB_KEY = {
  index: "home",
  "bookings/index": "bookings",
  "trucks/index": "trucks",
  "chat/index": "chat",
  "profile/index": "profile",
};

// Android's default tab ripple is a grey circle that spreads out of the tap
// and lingers; against a light bar it reads as a smudge, not as feedback.
// This gives a brief opacity press instead — the real confirmation is the
// destination becoming active, which is instant.
// The destination renders inside the BUTTON, not inside tabBarIcon. With
// tabBarShowLabel:false React Navigation gives the icon slot a fixed width,
// which clipped every label longer than the indicator — "Ho…", "Bo…", "Tru…",
// "Pro…". The button is flex:1 across the bar, so the label gets the whole
// destination width and the active pill has room to draw.
//
// `focused` comes from accessibilityState.selected — React Navigation's own
// view of which destination is active, i.e. the real back-stack state, not
// anything this file tracks.
const TabButton = ({ routeName, style, onPress, onLongPress, testID, ...rest }) => {
  // React Navigation 7 moved these props to the aria-* names; older versions
  // pass accessibilityState. Reading both means the active destination is
  // driven by the navigator's own state either way, rather than by anything
  // this file tracks itself.
  const selected = rest["aria-selected"] ?? rest.accessibilityState?.selected ?? false;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      // Announces selected/unselected, so the active destination reaches a
      // screen reader instead of only being visible.
      accessibilityState={{ selected }}
      accessibilityLabel={TAB_LABEL[routeName]}
      testID={testID}
      android_ripple={null}
      style={({ pressed }) => [styles.tabButton, style, pressed && styles.tabButtonPressed]}
    >
      <TabBarItem name={TAB_KEY[routeName]} label={TAB_LABEL[routeName]} focused={selected} />
    </Pressable>
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
        tabBarButton: (props) => <TabButton {...props} routeName={route.name} />,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textFaint,
        tabBarStyle: [styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom + theme.spacing.sm }],
        tabBarItemStyle: styles.barItem,
            tabBarShowLabel: false,
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

  // At least 48dp of tappable height per destination, spread equally across
  // the bar.
  tabButton: { flex: 1, minHeight: theme.layout.touchTarget, alignItems: "center", justifyContent: "center" },
  tabButtonPressed: { opacity: 0.6 },
});
