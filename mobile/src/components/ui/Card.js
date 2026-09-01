import { View, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { SectionTitle, Muted } from "./Typography";

// A card now actually looks like one. It used to be a white box on a white
// page separated by a 1px hairline, i.e. invisible — the theme's `bg` and
// `surface` were the same #ffffff. With a real canvas behind it (theme.js),
// `surface` + a soft elevation reads as a raised object without any extra work
// at the call site.
//
// `variant`:
//   default — a grouped object on the canvas. The common case.
//   flat    — border only, no lift. For a card inside another surface, where
//             a shadow would imply a depth that isn't there.
//   raised  — pulled forward: the primary action panel on a screen. Use once
//             per screen at most; if everything is raised, nothing is.
const VARIANTS = {
  default: { backgroundColor: theme.color.surface, borderColor: theme.color.border, ...theme.elevation[1] },
  flat: { backgroundColor: theme.color.surface, borderColor: theme.color.border, ...theme.elevation[0] },
  raised: { backgroundColor: theme.color.surface, borderColor: "transparent", ...theme.elevation[2] },
};

export const Card = ({ children, variant = "default", style, padded = true }) => (
  <View style={[styles.card, VARIANTS[variant] || VARIANTS.default, !padded && styles.unpadded, style]}>
    {children}
  </View>
);

// Most of the app's "cards" are not cards — they're a labelled group of
// content. Wrapping every one in a bordered white box is the single fastest
// way to make a mobile screen look like a web dashboard: the boxes compete for
// attention, the nesting doubles the padding, and the real card (the one
// holding the primary action) stops standing out because it looks like
// everything else.
//
// A Section is the honest version: a heading, optional supporting line, and
// content separated by spacing rather than by a border.
export const Section = ({ title, subtitle, action, children, style }) => (
  <View style={[styles.section, style]}>
    {(title || action) && (
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadText}>
          {title ? <SectionTitle>{title}</SectionTitle> : null}
          {subtitle ? <Muted>{subtitle}</Muted> : null}
        </View>
        {action}
      </View>
    )}
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: theme.layout.hairline,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.smd,
  },
  unpadded: { padding: 0 },
  section: { gap: theme.spacing.smd },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.smd,
  },
  sectionHeadText: { flex: 1, gap: theme.spacing.xxs },
});

export default Card;
