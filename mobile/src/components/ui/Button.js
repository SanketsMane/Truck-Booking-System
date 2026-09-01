import { Pressable, Text, View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { theme, withAlpha } from "../../theme";

// Variant names are unchanged — ~40 screens pass variant="secondary" / "danger"
// / "ghost" — but each now also declares how it presses and how it reads to a
// screen reader.
const VARIANTS = {
  primary: {
    bg: theme.color.accent,
    fg: theme.color.onAccent,
    border: theme.color.accent,
    ripple: withAlpha(theme.color.onAccent, 0.24),
  },
  secondary: {
    bg: theme.color.surface,
    fg: theme.color.text,
    border: theme.color.borderStrong,
    ripple: withAlpha(theme.color.text, 0.1),
  },
  danger: {
    bg: theme.color.danger,
    fg: "#ffffff",
    border: theme.color.danger,
    ripple: withAlpha("#ffffff", 0.24),
  },
  ghost: {
    bg: "transparent",
    fg: theme.color.textMuted,
    border: "transparent",
    ripple: withAlpha(theme.color.text, 0.08),
  },
};

// Every size is at or above the 48dp touch floor. `xs` is deliberately absent:
// a button smaller than a fingertip is a defect, and the escape hatch for a
// visually small control is hitSlop on an icon button, not a shrunken button.
const SIZES = {
  lg: { height: theme.layout.control.lg, paddingHorizontal: theme.spacing.xl, text: theme.text.bodyStrong },
  md: { height: theme.layout.control.md, paddingHorizontal: theme.spacing.lg, text: theme.text.bodyStrong },
  sm: { height: theme.layout.control.sm, paddingHorizontal: theme.spacing.smd, text: theme.text.label },
};

export const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  fullWidth,
  style,
  icon,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const colors = VARIANTS[variant] || VARIANTS.primary;
  const dims = SIZES[size] || SIZES.md;
  const inert = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      // Announced as a button, and — critically — announced as DISABLED or
      // BUSY. Without accessibilityState a screen-reader user taps a dead
      // control repeatedly with no feedback that anything is happening.
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      android_ripple={inert ? undefined : { color: colors.ripple, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingHorizontal,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        // A real disabled palette instead of fading the whole button: at
        // opacity 0.45 the white label faded along with the green fill and
        // ended up light-on-light, failing contrast in the exact state a
        // user sits and reads while working out what's missing.
        disabled && styles.disabled,
        // iOS has no ripple, so it gets the press feedback the platform
        // actually uses. On Android the ripple IS the feedback — dimming as
        // well would double up and read as sluggish.
        pressed && !inert && Platform.OS === "ios" && styles.pressedIos,
        style,
      ]}
    >
      {/* The label stays mounted while loading, just hidden, so the button
          keeps its exact width. Swapping the text out for a spinner makes the
          button jump to a different size at the worst possible moment — right
          after the user commits to an action. */}
      <View style={[styles.content, loading && styles.contentHidden]}>
        {icon}
        <Text style={[dims.text, { color: disabled ? theme.color.textDisabled : colors.fg }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {loading && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.spinnerWrap}>
            <ActivityIndicator color={colors.fg} size="small" />
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.control,
    borderWidth: theme.layout.hairline,
    // Clips the Android ripple to the rounded corners; without this it paints
    // as a rectangle over them.
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  contentHidden: { opacity: 0 },
  disabled: { backgroundColor: theme.color.surfaceRaised, borderColor: theme.color.border },
  spinnerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  pressedIos: { opacity: 0.6 },
});

export default Button;
