import { View, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../../theme";

export const LoadingView = () => (
  <View style={styles.wrap}>
    <ActivityIndicator size="large" color={theme.color.accent} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space(8),
  },
});

export default LoadingView;
