import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LoadingView } from "../src/components/ui/LoadingView";
import { useMobileConfigGate } from "../src/hooks/useMobileConfigGate";
import { useOnboarding } from "../src/hooks/useOnboarding";
import { UpdateRequiredScreen } from "../src/screens/UpdateRequiredScreen";
import { OnboardingScreen } from "../src/screens/OnboardingScreen";

// Both (app) and (auth) are always-mounted sibling routes now — unlike the
// old Stack.Protected split (guard={!!user} / guard={!user}), which hid
// (app) entirely from a logged-out visitor. That matched the OLD
// mobile-only navigation, but not the web app: on web, Home/Search/Trip
// Detail are public — only actually booking (or anything account-scoped:
// Bookings/Trucks/Chat/Profile's real content) requires a session. (app)
// stays the permanent home; individual screens that need auth check
// useAuth() themselves (see src/components/AuthRequired.js) and push
// /(auth)/login rather than the whole app branching on it up here.
const RootNavigator = () => {
  const { loading } = useAuth();
  const { blocked, reason } = useMobileConfigGate();
  const { seen, markSeen } = useOnboarding();

  // Checked in this order deliberately: an app version this backend won't
  // talk to shouldn't get as far as onboarding; onboarding (first launch,
  // once ever) comes before the auth check since it's shown to logged-out
  // AND logged-in installs alike (a fresh install, not a fresh session).
  if (blocked === null) return <LoadingView />;
  if (blocked) return <UpdateRequiredScreen reason={reason} />;

  if (seen === null) return <LoadingView />;
  if (!seen) return <OnboardingScreen onDone={markSeen} />;

  if (loading) return <LoadingView />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
