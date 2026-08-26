import { View, Text, StyleSheet } from "react-native";
import { theme, statusColor } from "../../theme";

export const StatusBadge = ({ status, children }) => {
  const key = statusColor(status);
  const bg = key === "textFaint" || key === "textMuted" ? theme.color.surfaceRaised : `${theme.color[key]}20`;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: theme.color[key] || theme.color.textMuted }]}>
        {children ?? status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
  },
  text: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    textTransform: "capitalize",
  },
});

export default StatusBadge;
