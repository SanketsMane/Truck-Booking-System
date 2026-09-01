import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { Body, Caption, Overline } from "./Typography";
import { PressableRow } from "./PressableRow";

// Settings navigation, as a grouped list rather than a stack of buttons.
//
// The profile screen rendered all sixteen of its destinations as full-width
// secondary Buttons — sixteen identical bordered boxes down the page, with
// nothing to distinguish "Password" from "Terms of Service" and no way for
// the eye to find anything. A button says "this performs an action"; these
// are places you go, which is what a row with a chevron says. Grouping them
// under headers, with an icon each, is what makes a list of sixteen things
// scannable instead of a wall.

export const ListGroup = ({ title, children, style }) => (
  <View style={[styles.group, style]}>
    {title ? <Overline style={styles.groupTitle}>{title}</Overline> : null}
    <View style={styles.card}>{children}</View>
  </View>
);

export const ListRow = ({
  icon,
  label,
  value,
  badge,
  onPress,
  first,
  tone = "default",
  accessibilityHint,
}) => (
  <PressableRow
    onPress={onPress}
    style={[styles.row, !first && styles.rowDivider]}
    contentStyle={styles.rowContent}
    accessibilityLabel={label}
    accessibilityHint={accessibilityHint}
  >
    {icon ? (
      <View style={[styles.icon, tone === "danger" && styles.iconDanger]}>
        <Ionicons
          name={icon}
          size={theme.layout.icon.md}
          color={tone === "danger" ? theme.color.danger : theme.color.accent}
        />
      </View>
    ) : null}

    <Body style={[styles.label, tone === "danger" && styles.labelDanger]} numberOfLines={1}>
      {label}
    </Body>

    {badge}
    {value ? <Caption numberOfLines={1}>{value}</Caption> : null}

    <Ionicons name="chevron-forward" size={theme.layout.icon.md} color={theme.color.textFaint} />
  </PressableRow>
);

const styles = StyleSheet.create({
  group: { gap: theme.spacing.sm },
  groupTitle: { paddingHorizontal: theme.spacing.xs },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
    overflow: "hidden",
  },
  row: { borderRadius: 0 },
  rowContent: { paddingVertical: theme.spacing.smd, gap: theme.spacing.smd },
  // Inset so the divider starts past the icon column, which is what stops a
  // grouped list reading as a table of unrelated rows.
  rowDivider: {
    borderTopWidth: theme.layout.hairline,
    borderTopColor: theme.color.border,
  },
  icon: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accentSoft,
  },
  iconDanger: { backgroundColor: theme.color.dangerSoft },
  label: { flex: 1 },
  labelDanger: { color: theme.color.danger },
});

export default ListGroup;
