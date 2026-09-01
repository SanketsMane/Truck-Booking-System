import { View, Text, StyleSheet } from "react-native";
import { theme, statusColor, withAlpha } from "../../theme";

// Status is never carried by colour alone: the label is always present, so the
// badge still reads correctly for a colour-blind user or in a screenshot
// printed in greyscale. The tint is reinforcement, not the message.
export const StatusBadge = ({ status, children, style }) => {
  const key = statusColor(status);
  const fg = theme.color[key] || theme.color.textMuted;
  // Neutral statuses (expired, inactive) get a plain grey chip — tinting them
  // would imply a meaning they don't carry.
  const isNeutral = key === "textFaint" || key === "textMuted";
  const bg = isNeutral ? theme.color.surfaceRaised : withAlpha(fg, 0.12);

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {children ?? status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  text: {
    ...theme.text.overline,
    textTransform: "capitalize",
    // The scale's overline tracking is tuned for uppercase; capitalised text
    // at that spacing reads as stretched.
    letterSpacing: 0.2,
  },
});

export default StatusBadge;
