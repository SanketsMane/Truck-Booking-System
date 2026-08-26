import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { PageTitle, Body } from "./ui/Typography";
import { Button } from "./ui/Button";
import { useAuth } from "../context/AuthContext";

// Home, Search Results, and Trip Detail work for anyone (matching the web
// app, where only booking itself needs an account) — but Bookings, Trucks,
// and Chat are inherently account-scoped, so there's nothing useful to
// show an anonymous visitor there beyond a way to log in. This wraps that
// exact prompt so it's consistent everywhere it's needed instead of each
// tab screen reinventing it.
export const AuthRequired = ({ title, body, children }) => {
  const { user } = useAuth();
  const router = useRouter();

  if (user) return children;

  return (
    <View style={styles.wrap}>
      <PageTitle style={styles.title}>{title || "Log in to continue"}</PageTitle>
      <Body style={styles.body}>{body || "Create a free account or log in to use this."}</Body>
      <Button title="Log in" onPress={() => router.push("/(auth)/login")} fullWidth />
      <Button title="Create an account" variant="secondary" onPress={() => router.push("/(auth)/signup")} fullWidth />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.space(6), gap: theme.space(3) },
  title: { textAlign: "center" },
  body: { textAlign: "center", color: theme.color.textMuted },
});

export default AuthRequired;
