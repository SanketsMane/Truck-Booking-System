import { View, Pressable, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";

// Switching between two views of the same list — "as shipper" / "as
// transporter" — is a filter, not two separate actions. It was built from two
// full-size Buttons, one primary and one secondary, which reads as "here are
// two things you can do" and takes a whole row of vertical space to say it.
//
// A segmented control says the right thing: these are mutually exclusive
// views, exactly one is active. It also fixes the accessibility of it — two
// buttons announce as buttons with no indication that one is currently
// selected, where each segment here announces its selected state.
export const SegmentedControl = ({ segments, value, onChange, style }) => (
  <View style={[styles.track, style]} accessibilityRole="tablist">
    {segments.map((segment) => {
      const active = segment.value === value;
      return (
        <Pressable
          key={segment.value}
          onPress={() => onChange(segment.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={segment.label}
          style={[styles.segment, active && styles.segmentActive]}
        >
          <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
            {segment.label}
          </Text>
          {segment.count != null && (
            <View style={[styles.badge, active && styles.badgeActive]}>
              <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{segment.count}</Text>
            </View>
          )}
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: theme.spacing.xxs,
    borderRadius: theme.radius.control,
    backgroundColor: theme.color.surfaceRaised,
    gap: theme.spacing.xxs,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    // Keeps each segment on the 48dp touch floor even though the control
    // reads as a compact filter rather than a set of buttons.
    minHeight: theme.layout.control.md - theme.spacing.xs,
    paddingHorizontal: theme.spacing.smd,
    borderRadius: theme.radius.control - 2,
  },
  segmentActive: {
    backgroundColor: theme.color.surface,
    ...theme.elevation[1],
  },
  label: { ...theme.text.label, color: theme.color.textMuted },
  labelActive: { color: theme.color.text },
  badge: {
    minWidth: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
    alignItems: "center",
  },
  badgeActive: { backgroundColor: theme.color.accentSoft },
  badgeText: { ...theme.text.caption, color: theme.color.textMuted },
  badgeTextActive: { color: theme.color.accent },
});

export default SegmentedControl;
