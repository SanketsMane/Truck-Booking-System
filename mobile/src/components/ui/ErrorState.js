import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { BodyStrong, Muted } from "./Typography";
import { Button } from "./Button";

// The state the app didn't have. Screens currently do
// `.catch(() => setThing([]))`, which turns "the network is down" into "there
// is nothing here" — the user is told a lie, and the one useful action
// (retry) isn't offered. An empty list and a failed request look identical and
// need completely different responses.
//
// `onRetry` is the point of this component. If a caller has nothing to retry,
// what they want is EmptyState, not this.
export const ErrorState = ({
  title = "Couldn't load this",
  message,
  onRetry,
  retryLabel = "Try again",
  compact,
}) => (
  <View style={[styles.wrap, compact && styles.compact]} accessible accessibilityRole="alert">
    <View style={styles.icon}>
      <Ionicons name="cloud-offline-outline" size={theme.layout.icon.lg} color={theme.color.danger} />
    </View>
    <View style={styles.text}>
      <BodyStrong>{title}</BodyStrong>
      {/* The server's own message when there is one — it's usually more
          specific than anything generic written here. Falls back to plain
          language that says what to do, not what threw. */}
      <Muted style={styles.message}>
        {message || "Check your connection and try again."}
      </Muted>
    </View>
    {onRetry ? <Button title={retryLabel} variant="secondary" size="sm" onPress={onRetry} /> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: theme.spacing.smd,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
  },
  compact: { paddingVertical: theme.spacing.md },
  icon: {
    width: theme.spacing.huge,
    height: theme.spacing.huge,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.dangerSoft,
  },
  text: { alignItems: "center", gap: theme.spacing.xs },
  message: { textAlign: "center" },
});

export default ErrorState;
