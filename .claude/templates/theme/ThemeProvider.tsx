/**
 * ThemeProvider, useTheme and useThemedStyles.
 *
 * No component calls useColorScheme() directly, and no component
 * contains a literal colour or size.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from './theme';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  children,
  preference = 'system',
}: {
  children: React.ReactNode;
  /** Wire this to a persisted setting if the app offers a Light/Dark/System override. */
  preference?: ColorSchemePreference;
}) {
  const system = useColorScheme();
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/**
 * Styles derived from the theme and memoised — never inline objects in a
 * render path, never literal values.
 *
 *   const styles = useThemedStyles(({ color, spacing, radius, type }) => ({
 *     card: { backgroundColor: color.surface.raised, borderRadius: radius.lg, padding: spacing[5] },
 *     title: { ...type.subtitle, color: color.text.primary },
 *   }));
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}

export type { Theme } from './theme';
