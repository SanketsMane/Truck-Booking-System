import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Easing, AccessibilityInfo } from "react-native";
import { theme } from "../../theme";

// A skeleton beats a centred spinner for content that has a known shape: it
// tells the user what is arriving and where, so the screen doesn't jump when
// it does. The app currently shows LoadingView (a bare spinner) for every
// list, which is why loading feels like a stall rather than progress.
//
// Respects reduce-motion: for a user who has asked the OS to stop animations,
// a perpetual pulse is exactly the kind of thing that causes discomfort, so it
// settles to a static block instead.
export const Skeleton = ({ width = "100%", height = theme.spacing.md, radius = theme.radius.xs, style }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const loop = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      loop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: theme.motion.deliberate,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: theme.motion.deliberate,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.current.start();
    };

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!cancelled && !reduced) start();
    });

    return () => {
      cancelled = true;
      loop.current?.stop();
    };
  }, [pulse]);

  return (
    <Animated.View
      // Announced as one "Loading" element rather than as a pile of blank
      // views a screen reader would otherwise walk through one by one.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) },
        style,
      ]}
    />
  );
};

// The shape of one result row, so the list doesn't reflow when data lands.
export const SkeletonRow = () => (
  <View style={styles.row}>
    <Skeleton width={44} height={44} radius={theme.radius.sm} />
    <View style={styles.rowText}>
      <Skeleton width="62%" height={theme.spacing.md} />
      <Skeleton width="38%" height={theme.spacing.smd} />
    </View>
  </View>
);

export const SkeletonList = ({ count = 4 }) => (
  <View
    style={styles.list}
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel="Loading"
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: { backgroundColor: theme.color.skeleton },
  list: { gap: theme.spacing.smd },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.smd,
    padding: theme.spacing.md,
    backgroundColor: theme.color.surface,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
  },
  rowText: { flex: 1, gap: theme.spacing.sm },
});

export default Skeleton;
