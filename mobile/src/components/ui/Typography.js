import { Text, StyleSheet } from "react-native";
import { theme } from "../../theme";

export const PageTitle = ({ children, style }) => <Text style={[styles.pageTitle, style]}>{children}</Text>;

export const SectionTitle = ({ children, style }) => <Text style={[styles.sectionTitle, style]}>{children}</Text>;

export const Body = ({ children, style }) => <Text style={[styles.body, style]}>{children}</Text>;

export const Muted = ({ children, style }) => <Text style={[styles.muted, style]}>{children}</Text>;

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: theme.font.size.xxl,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
  },
  sectionTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.text,
  },
  body: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
    lineHeight: theme.font.size.md * 1.5,
  },
  muted: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
    lineHeight: theme.font.size.sm * 1.4,
  },
});
