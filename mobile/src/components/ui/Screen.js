import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";

// Every screen's outer wrapper — safe-area aware, scrollable by default
// (opt out with scroll={false} for a screen that manages its own scrolling,
// e.g. a chat thread's inverted FlatList).
//
// Keyboard handling lives here rather than in each form screen. Half this app
// is forms — booking, trip posting, truck registration, profile, support —
// and not one of them handled the keyboard, so on a small phone the field
// being typed into, and the submit button under it, were simply covered.
// Fixing it once here fixes it everywhere, instead of relying on every future
// screen to remember.
//
// iOS needs "padding": the keyboard slides over the view and nothing reflows
// on its own. Android resizes the window itself (adjustResize), so applying
// padding there too would double-count and leave a keyboard-sized gap.
export const Screen = ({
  children,
  scroll = true,
  style,
  contentStyle,
  keyboardAvoiding = true,
  // A sticky footer kept out of the scroll area — the right home for a
  // primary action on a long detail screen, so the CTA stays reachable
  // without scrolling to the bottom of the page to find it.
  footer,
}) => {
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? {
        contentContainerStyle: [styles.content, contentStyle],
        keyboardShouldPersistTaps: "handled",
        // Lets a drag dismiss the keyboard — what someone reaching to scroll
        // a covered form instinctively tries first.
        keyboardDismissMode: Platform.OS === "ios" ? "interactive" : "on-drag",
        showsVerticalScrollIndicator: false,
      }
    : { style: [styles.content, styles.flex, contentStyle] };

  const body = (
    <>
      <Container {...containerProps}>{children}</Container>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={["top", "bottom"]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  flex: { flex: 1 },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.color.surface,
    borderTopWidth: theme.layout.hairline,
    borderTopColor: theme.color.border,
    ...theme.elevation[2],
  },
});

export default Screen;
