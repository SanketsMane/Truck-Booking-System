import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { Body } from "./Typography";

// Every screen's outer wrapper — safe-area aware, scrollable by default
// (opt out with scroll={false} for a screen that manages its own scrolling,
// e.g. a chat thread's inverted FlatList).
//
// THE HEADER EXISTS BECAUSE THE APP HAD NO WAY BACK. app/(app)/_layout.js
// sets headerShown:false, and every detail screen — edit profile, password,
// roles, devices, verification, support, trip manage — is a tab-level route
// rather than a stack screen, so none of them rendered a back control at all.
// router.back() worked; there was simply nothing on screen to press. Opening
// any of them was a dead end unless you knew to use the system gesture.
//
// Doing it here rather than turning on native headers keeps one visual
// language across the app and gives a real title, and `title` is opt-in so
// the five tab roots (which have nowhere to go back to) are unaffected.
//
// Keyboard handling lives here for the same reason: half this app is forms
// and not one of them handled the keyboard, so on a small phone the field
// being typed into, and the submit button under it, were simply covered.
// iOS needs "padding" — the keyboard slides over the view and nothing
// reflows. Android resizes the window itself (adjustResize), so padding
// there too would double-count and leave a keyboard-sized gap.
export const Screen = ({
  children,
  scroll = true,
  style,
  contentStyle,
  keyboardAvoiding = true,
  // Renders the header. Pass it on any screen that was pushed onto another.
  title,
  // Right-hand slot — a "Save", an overflow menu, a filter.
  headerAction,
  // Escape hatch for a screen that wants the bar but not the back control.
  showBack = true,
  footer,
}) => {
  const router = useRouter();
  // Only offer back when there's somewhere to go. A chevron that does nothing
  // is worse than no chevron.
  const canGoBack = showBack && router.canGoBack();

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
      {title !== undefined && (
        <View style={styles.header}>
          {canGoBack ? (
            <Pressable
              onPress={() => router.back()}
              style={styles.back}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={theme.layout.icon.lg} color={theme.color.text} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <Body style={styles.title} numberOfLines={1}>
            {title}
          </Body>
          {/* Mirrors the back control's width even when empty, so the title
              stays optically centred instead of drifting left. */}
          <View style={styles.actionSlot}>{headerAction}</View>
        </View>
      )}
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

const HEADER_SLOT = 40;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: theme.layout.hairline,
    borderBottomColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  back: {
    width: HEADER_SLOT,
    height: HEADER_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center", fontWeight: theme.font.weight.semibold },
  actionSlot: { minWidth: HEADER_SLOT, alignItems: "flex-end", justifyContent: "center" },

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
