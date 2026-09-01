/**
 * Button — every interaction state, both platforms, one component.
 *
 * States that matter: default, pressed, disabled, loading. The loading
 * state keeps the button's width so the layout never jumps.
 * See references/components.md.
 */
import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'lg' | 'md' | 'sm';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Only when the label alone is not enough context for a screen reader. */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityHint,
  style,
}: Props) {
  const { color, spacing, radius, type, size: sz } = useTheme();
  const isInactive = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary:     { bg: color.brand.primary,      fg: color.brand.onPrimary },
    secondary:   { bg: 'transparent',            fg: color.brand.primary, border: color.border.default },
    ghost:       { bg: 'transparent',            fg: color.brand.primary },
    destructive: { bg: color.status.error.base,  fg: color.text.inverse },
  };
  const c = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      // busy and disabled must be announced, or a screen-reader user taps a dead control
      accessibilityState={{ disabled: isInactive, busy: loading }}
      android_ripple={isInactive ? undefined : { color: color.overlay.pressed }}
      style={({ pressed }) => [
        {
          minHeight: sz.button[size],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing[7],
          borderRadius: radius.md,
          backgroundColor: disabled ? color.surface.disabled : c.bg,
          borderWidth: c.border ? 1 : 0,
          borderColor: c.border,
          overflow: 'hidden', // clips the Android ripple to the radius
          opacity: Platform.OS === 'ios' && pressed && !isInactive ? 0.9 : 1,
          transform: [{ scale: pressed && !isInactive ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {/* The label stays mounted while loading so the width never changes. */}
      <Text
        numberOfLines={1}
        style={[
          size === 'sm' ? type.label : type.bodyStrong,
          { color: disabled ? color.text.disabled : c.fg, opacity: loading ? 0 : 1 },
        ]}
      >
        {label}
      </Text>
      {loading ? (
        <View style={{ position: 'absolute' }}>
          <ActivityIndicator color={c.fg} size="small" />
        </View>
      ) : null}
    </Pressable>
  );
}
