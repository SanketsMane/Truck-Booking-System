/**
 * The three states every async surface needs, as real components.
 *
 * A screen without these is not finished. Design rules:
 * references/loading-states.md, empty-states.md, error-states.md.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, Platform, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

/* ------------------------------------------------------------ Skeleton */

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
}) {
  const { color, radius, duration } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (reduceMotion) return; // static block, no pulse
    opacity.value = withRepeat(withTiming(1, { duration: duration.pulse }), -1, true);
  }, [reduceMotion, opacity, duration.pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radius.sm,
          backgroundColor: color.skeleton.base,
        },
        animated,
      ]}
    />
  );
}

/* --------------------------------------------------------------- Empty */

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  const { color, spacing, type } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: spacing[10],
        paddingHorizontal: spacing[7],
      }}
    >
      {icon ? <View style={{ marginBottom: spacing[5] }}>{icon}</View> : null}
      <Text
        accessibilityRole="header"
        style={[type.subtitle, { color: color.text.primary, textAlign: 'center' }]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={[
            type.bodySmall,
            { color: color.text.secondary, textAlign: 'center', marginTop: spacing[3] },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Action label={actionLabel} onPress={onAction} marginTop={spacing[7]} />
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------- Error */

export function ErrorState({
  title = 'Something went wrong',
  message = 'Check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { color, spacing, type } = useTheme();

  // A screen-reader user gets no visual cue that the fetch failed.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${message}`);
  }, [title, message]);

  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        paddingVertical: spacing[10],
        paddingHorizontal: spacing[7],
      }}
    >
      <Text style={[type.subtitle, { color: color.text.primary, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text
        style={[
          type.bodySmall,
          { color: color.text.secondary, textAlign: 'center', marginTop: spacing[3] },
        ]}
      >
        {message}
      </Text>
      {onRetry ? (
        <Action label={retryLabel} onPress={onRetry} marginTop={spacing[7]} />
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------- Action */

function Action({
  label,
  onPress,
  marginTop,
}: {
  label: string;
  onPress: () => void;
  marginTop: number;
}) {
  const { color, spacing, radius, type, size } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: color.overlay.pressed }}
      style={({ pressed }) => ({
        marginTop,
        minHeight: size.touchTarget,
        justifyContent: 'center',
        paddingHorizontal: spacing[7],
        borderRadius: radius.md,
        backgroundColor: color.brand.primary,
        overflow: 'hidden', // clips the Android ripple to the radius
        opacity: Platform.OS === 'ios' && pressed ? 0.9 : 1,
      })}
    >
      <Text style={[type.bodyStrong, { color: color.brand.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}
