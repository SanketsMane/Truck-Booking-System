import { Text, StyleSheet } from "react-native";
import { theme } from "../../theme";

// The four original roles (PageTitle / SectionTitle / Body / Muted) are kept
// with the same names because ~40 screens import them. What's new is that each
// now comes from a named style in the type scale with a real line height,
// instead of multiplying a font size by 1.4 inline — which produced
// fractional line heights that land between pixels and drift apart between
// components that were meant to match.
//
// Also new: the roles the app actually needed and didn't have. Every screen
// showing a price was reaching for Body or Muted, so ₹1,20,000 rendered in
// proportional figures — the digits change width as the number changes, and a
// column of amounts visibly shimmers instead of aligning.

export const PageTitle = ({ children, style, ...rest }) => (
  <Text style={[styles.pageTitle, style]} accessibilityRole="header" {...rest}>
    {children}
  </Text>
);

export const SectionTitle = ({ children, style, ...rest }) => (
  <Text style={[styles.sectionTitle, style]} accessibilityRole="header" {...rest}>
    {children}
  </Text>
);

export const Body = ({ children, style, ...rest }) => (
  <Text style={[styles.body, style]} {...rest}>
    {children}
  </Text>
);

export const BodyStrong = ({ children, style, ...rest }) => (
  <Text style={[styles.bodyStrong, style]} {...rest}>
    {children}
  </Text>
);

export const Muted = ({ children, style, ...rest }) => (
  <Text style={[styles.muted, style]} {...rest}>
    {children}
  </Text>
);

export const Caption = ({ children, style, ...rest }) => (
  <Text style={[styles.caption, style]} {...rest}>
    {children}
  </Text>
);

// A form/field label, or the small heading above a value in a detail row.
export const Label = ({ children, style, ...rest }) => (
  <Text style={[styles.label, style]} {...rest}>
    {children}
  </Text>
);

// Section eyebrow — "TRIP DETAILS". Uppercase is applied by the style, so
// callers pass normal sentence case and screen readers announce it normally
// rather than spelling out capitals.
export const Overline = ({ children, style, ...rest }) => (
  <Text style={[styles.overline, style]} {...rest}>
    {children}
  </Text>
);

// Money. `size` picks the scale step; `tone` colours a credit/debit/pending
// amount without borrowing the status palette, so an outgoing payment is not
// painted with the same red that means "something failed".
//
// numberOfLines={1} is deliberate: an amount that wraps or ellipsises is worse
// than one that shrinks, and adjustsFontSizeToFit keeps a long value legible
// on a small screen instead of truncating it to a different number.
const MONEY_TONE = {
  default: theme.color.text,
  positive: theme.color.moneyPositive,
  negative: theme.color.moneyNegative,
  pending: theme.color.moneyPending,
  muted: theme.color.textMuted,
  onAccent: theme.color.onAccent,
};

export const Amount = ({ children, size = "sm", tone = "default", style, ...rest }) => (
  <Text
    style={[theme.money[size] || theme.money.sm, { color: MONEY_TONE[tone] || MONEY_TONE.default }, style]}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={0.85}
    {...rest}
  >
    {children}
  </Text>
);

const styles = StyleSheet.create({
  pageTitle: { ...theme.text.headline, color: theme.color.text },
  sectionTitle: { ...theme.text.title, color: theme.color.text },
  body: { ...theme.text.body, color: theme.color.text },
  bodyStrong: { ...theme.text.bodyStrong, color: theme.color.text },
  muted: { ...theme.text.bodySmall, color: theme.color.textMuted },
  caption: { ...theme.text.caption, color: theme.color.textFaint },
  label: { ...theme.text.label, color: theme.color.textMuted },
  overline: {
    ...theme.text.overline,
    color: theme.color.textFaint,
    textTransform: "uppercase",
  },
});

export default { PageTitle, SectionTitle, Body, BodyStrong, Muted, Caption, Label, Overline, Amount };
