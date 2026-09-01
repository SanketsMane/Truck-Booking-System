import { View, Image, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { BodyStrong, Muted } from "./Typography";

import search from "../../../assets/empty-search.png";
import bookings from "../../../assets/empty-bookings.png";
import trips from "../../../assets/empty-trips.png";
import trucks from "../../../assets/empty-trucks.png";

// An empty state is the one moment a user is definitely looking for something
// to do, so it gets an illustration, a plain statement of what's missing, a
// line explaining why, and — where one exists — the action that fills it.
// These screens previously showed a grey outline icon in a circle, which said
// "nothing here" and stopped.
const ART = { search, bookings, trips, trucks };

export const EmptyIllustration = ({ art, title, message, action, compact }) => (
  <View style={[styles.wrap, compact && styles.compact]}>
    {ART[art] ? (
      <Image
        source={ART[art]}
        style={[styles.art, compact && styles.artCompact]}
        resizeMode="contain"
        // Decorative: the title and message below already say everything this
        // conveys, so announcing it would just make a screen reader repeat
        // itself.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    ) : null}
    <BodyStrong style={styles.title}>{title}</BodyStrong>
    {message ? <Muted style={styles.message}>{message}</Muted> : null}
    {action}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: theme.spacing.smd,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  compact: { paddingVertical: theme.spacing.md },
  art: { width: 200, height: 200 },
  artCompact: { width: 120, height: 120 },
  title: { textAlign: "center" },
  message: { textAlign: "center" },
});

export default EmptyIllustration;
