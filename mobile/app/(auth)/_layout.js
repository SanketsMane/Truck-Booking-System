import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function AuthLayout() {
  const { user } = useAuth();
  // (auth) is reachable from a "Log in" button pushed from anywhere in
  // (app) now (see AuthRequired) rather than being the app's alternate
  // top-level branch — once that login actually succeeds, bounce straight
  // back rather than leaving a stale login screen on the stack.
  if (user) return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
