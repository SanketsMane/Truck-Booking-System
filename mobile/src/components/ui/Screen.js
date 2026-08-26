import { StyleSheet, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";

// Every screen's outer wrapper — safe-area aware, scrollable by default
// (opt out with scroll={false} for a screen that manages its own scrolling,
// e.g. a chat thread's inverted FlatList).
export const Screen = ({ children, scroll = true, style, contentStyle }) => {
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: [styles.content, contentStyle], keyboardShouldPersistTaps: "handled" }
    : { style: [styles.content, { flex: 1 }, contentStyle] };

  return (
    <SafeAreaView style={[styles.safe, style]} edges={["top", "bottom"]}>
      <Container {...containerProps}>{children}</Container>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  content: {
    padding: theme.space(4),
    gap: theme.space(4),
  },
});

export default Screen;
