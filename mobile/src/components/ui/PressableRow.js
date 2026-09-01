import { Pressable, View, StyleSheet, Platform } from "react-native";
import { theme, withAlpha } from "../../theme";

// A tappable row that is actually tappable.
//
// The app was full of bare `<Pressable style={someStaticStyle}>` rows — the
// home screen's popular routes, list items, menu entries. Two defects, every
// time:
//   1. ~38dp tall, below the 48dp floor, so they're hard to hit and fail
//      accessibility outright.
//   2. No pressed state at all. The user taps, nothing acknowledges it, and
//      for the ~300ms before the next screen appears the app looks broken.
//      A dead tap is the cheapest possible way to feel unfinished.
//
// This enforces the floor via minHeight and gives each platform the feedback
// it expects: a ripple on Android, a background tint on iOS.
export const PressableRow = ({
  children,
  onPress,
  onLongPress,
  disabled,
  size = "single",
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  ...rest
}) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    disabled={disabled}
    accessibilityRole={accessibilityRole}
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled: !!disabled }}
    android_ripple={disabled ? undefined : { color: withAlpha(theme.color.text, 0.08) }}
    style={({ pressed }) => [
      styles.row,
      { minHeight: theme.layout.row[size] || theme.layout.row.single },
      disabled && styles.disabled,
      pressed && !disabled && Platform.OS === "ios" && styles.pressedIos,
      style,
    ]}
    {...rest}
  >
    <View style={[styles.content, contentStyle]}>{children}</View>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    justifyContent: "center",
    borderRadius: theme.radius.control,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.smd,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.smd,
  },
  pressedIos: { backgroundColor: theme.color.surfaceRaised },
  disabled: { opacity: 0.45 },
});

export default PressableRow;
