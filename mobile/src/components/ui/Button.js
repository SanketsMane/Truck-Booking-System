import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { theme } from "../../theme";

const VARIANTS = {
  primary: { bg: theme.color.accent, fg: theme.color.onAccent, border: theme.color.accent },
  secondary: { bg: theme.color.surface, fg: theme.color.text, border: theme.color.border },
  danger: { bg: theme.color.danger, fg: "#ffffff", border: theme.color.danger },
  ghost: { bg: "transparent", fg: theme.color.textMuted, border: "transparent" },
};

export const Button = ({ title, onPress, variant = "primary", disabled, loading, fullWidth, style, icon }) => {
  const colors = VARIANTS[variant] || VARIANTS.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: colors.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  text: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.semibold,
  },
});

export default Button;
