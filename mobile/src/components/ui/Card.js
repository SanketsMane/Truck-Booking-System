import { View, StyleSheet } from "react-native";
import { theme } from "../../theme";

export const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
    gap: theme.space(3),
  },
});

export default Card;
