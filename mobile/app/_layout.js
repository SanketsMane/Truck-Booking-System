import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LoadingView } from "../src/components/ui/LoadingView";
import { useMobileConfigGate } from "../src/hooks/useMobileConfigGate";
import { UpdateRequiredScreen } from "../src/screens/UpdateRequiredScreen";

// Stack.Protected's guard prop is the current (SDK 57-era) Expo Router
// pattern for auth-gated routing — it conditionally mounts a group and
// handles the redirect automatically when `guard` flips, rather than each
// screen manually checking auth and calling <Redirect>.
const RootNavigator = () => {
  const { user, loading } = useAuth();
  const { blocked, reason } = useMobileConfigGate();

  // The version/maintenance gate is checked before auth even resolves —
  // an app this backend won't talk to shouldn't get as far as a login
  // attempt failing for a confusing, unrelated reason.
  if (blocked === null) return <LoadingView />;
  if (blocked) return <UpdateRequiredScreen reason={reason} />;

  if (loading) return <LoadingView />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
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
