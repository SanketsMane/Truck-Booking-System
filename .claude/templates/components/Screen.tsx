/**
 * Screen — safe areas, gutter and scroll behaviour, solved once.
 *
 * Every screen uses this. It is the reason safe-area bugs do not
 * multiply across a codebase. See references/safe-areas.md.
 *
 * Requires: react-native-safe-area-context (<SafeAreaProvider> at the root).
 */
import React from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. Use false for screens that own their own list. */
  scroll?: boolean;
  /** Apply the top inset. Leave false when a navigator header already applies it. */
  edgeTop?: boolean;
  /** Apply the bottom inset. Set false when a tab bar already applies it. */
  edgeBottom?: boolean;
  /** Drop horizontal padding for full-bleed layouts; sections re-apply their own. */
  bleed?: boolean;
  /** Extra bottom padding, e.g. the height of a pinned CTA. */
  bottomOffset?: number;
  background?: 'canvas' | 'surface';
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  edgeTop = false,
  edgeBottom = true,
  bleed = false,
  bottomOffset = 0,
  background = 'canvas',
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(); // re-renders on rotate/fold; Dimensions.get does not
  const { color, spacing, layout, breakpoint } = useTheme();

  const gutter = bleed
    ? 0
    : width >= breakpoint.large
      ? layout.gutter.expanded
      : width >= breakpoint.compact
        ? layout.gutter.regular
        : layout.gutter.compact;

  // Landscape on notched devices gives non-zero left/right insets.
  const sideInset = Math.max(insets.left, insets.right);

  const container: ViewStyle = {
    flex: 1,
    backgroundColor:
      background === 'canvas' ? color.bg.canvas : color.surface.default,
  };

  const content: ViewStyle = {
    paddingTop: edgeTop ? insets.top : 0,
    paddingHorizontal: gutter + sideInset,
    // max() matters: insets.bottom is 0 on devices with no home indicator,
    // and content flush to the screen edge looks broken.
    paddingBottom: edgeBottom
      ? Math.max(insets.bottom, spacing[5]) + bottomOffset
      : bottomOffset,
  };

  // Cap and centre on large screens — a full-width text column is unreadable.
  const capped: ViewStyle =
    width > layout.maxContentWidth
      ? { maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }
      : {};

  if (!scroll) {
    return <View style={[container, content, capped, style]}>{children}</View>;
  }

  return (
    <View style={[container, style]}>
      <ScrollView
        contentContainerStyle={[content, capped, { flexGrow: 1 }]}
        // Without this, the first tap only dismisses the keyboard and the
        // user's button tap is swallowed.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
