import { View, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { Body } from "./Typography";

export const EmptyState = ({ children }) => (
  <View style={styles.wrap}>
    <Body style={styles.text}>{children}</Body>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space(8),
    gap: theme.space(3),
  },
  text: {
    textAlign: "center",
    color: theme.color.textMuted,
  },
});

export default EmptyState;
