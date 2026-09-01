import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, BodyStrong, Muted, Caption } from "../../../src/components/ui/Typography";
import { Button } from "../../../src/components/ui/Button";
import { Avatar } from "../../../src/components/ui/Avatar";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { ListGroup, ListRow } from "../../../src/components/ui/ListGroup";
import { PressableRow } from "../../../src/components/ui/PressableRow";
import { theme } from "../../../src/theme";
import { getMyVerifications } from "../../../src/api/verification";
import { ratingLabel } from "../../../src/utils/format";
import { useAuth } from "../../../src/context/AuthContext";

const ACCOUNT_ITEMS = [
  { href: "/(app)/profile/edit", label: "Personal info", icon: "person-outline" },
  { href: "/(app)/profile/password", label: "Password", icon: "lock-closed-outline" },
  { href: "/(app)/profile/roles", label: "Roles", icon: "swap-horizontal-outline" },
  { href: "/(app)/profile/notification-settings", label: "Notifications", icon: "notifications-outline" },
  { href: "/(app)/profile/devices", label: "Devices", icon: "phone-portrait-outline" },
];

const HELP_ITEMS = [
  { href: "/(app)/support", label: "Support", icon: "chatbubble-ellipses-outline" },
  { href: "/(app)/disputes", label: "Disputes", icon: "alert-circle-outline" },
];

// Public regardless of login state — the same links the web footer shows every
// visitor. Kept last and visually quieter than account settings: someone
// opening Profile is far more often here to change a setting than to read the
// Terms.
const INFO_ITEMS = [
  { href: "/(app)/about", label: "About TruckGee", icon: "information-circle-outline" },
  { href: "/(app)/for-shippers", label: "For shippers", icon: "cube-outline" },
  { href: "/(app)/help", label: "Help centre", icon: "help-buoy-outline" },
  { href: "/(app)/faq", label: "FAQ", icon: "help-circle-outline" },
  { href: "/(app)/content/blog", label: "Blog", icon: "newspaper-outline" },
  { href: "/(app)/content/news", label: "News", icon: "megaphone-outline" },
  { href: "/(app)/content/update", label: "Product updates", icon: "sparkles-outline" },
  { href: "/(app)/terms", label: "Terms of Service", icon: "document-text-outline" },
  { href: "/(app)/privacy", label: "Privacy Policy", icon: "shield-outline" },
];

const ROLE_LABEL = { transporter: "Driver verification", shipper: "Shipper verification" };

export const ProfileScreen = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [verifications, setVerifications] = useState([]);

  // Verification state is the most consequential thing on this screen — it
  // decides whether you can post a trip or get a booking confirmed — and it
  // wasn't shown at all: each role rendered a row saying "Driver
  // verification" with a Manage button, and no indication of whether you
  // were verified, pending or rejected. Refetched on focus so returning from
  // the verification screen shows the new state rather than a stale one.
  useFocusEffect(
    useCallback(() => {
      if (!user) return undefined;
      let cancelled = false;
      getMyVerifications()
        .then((res) => {
          if (!cancelled) setVerifications(res.verifications || []);
        })
        .catch(() => {
          // Non-blocking: the rows still render and stay tappable, they just
          // can't show a status chip. Failing to fetch a badge is not a
          // reason to break the whole settings screen.
          if (!cancelled) setVerifications([]);
        });
      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const statusFor = (role) => verifications.find((v) => v.type === role)?.status;

  if (!user) {
    return (
      <Screen>
        <View style={styles.signedOut}>
          <View style={styles.signedOutIcon}>
            <Ionicons name="person-circle-outline" size={theme.layout.icon.xl} color={theme.color.textFaint} />
          </View>
          <BodyStrong>You&apos;re not signed in</BodyStrong>
          <Muted style={styles.centred}>Log in or create a free account to book, post trips, and chat.</Muted>
          <View style={styles.signedOutActions}>
            <Button title="Log in" size="lg" onPress={() => router.push("/(auth)/login")} fullWidth />
            <Button
              title="Create an account"
              variant="secondary"
              onPress={() => router.push("/(auth)/signup")}
              fullWidth
            />
          </View>
        </View>

        <ListGroup title="More">
          {INFO_ITEMS.map((item, i) => (
            <ListRow key={item.href} {...item} first={i === 0} onPress={() => router.push(item.href)} />
          ))}
        </ListGroup>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageTitle>Profile</PageTitle>

      {/* The card itself opens the editor. A separate "Edit profile" button
          under the avatar was both visually stranded — a small left-aligned
          control with nothing to align to — and redundant, since "Personal
          info" below goes to exactly the same screen. Tapping your own
          avatar to edit it is the pattern people already expect. */}
      <PressableRow
        onPress={() => router.push("/(app)/profile/edit")}
        style={styles.identityCard}
        contentStyle={styles.identityContent}
        accessibilityLabel={`${user.name}. Edit profile`}
        accessibilityHint="Opens your personal information"
      >
        <Avatar name={user.name} photo={user.profilePhoto} size={64} />
        <View style={styles.identityText}>
          <BodyStrong numberOfLines={1}>{user.name}</BodyStrong>
          <Caption numberOfLines={1}>{user.email}</Caption>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={theme.layout.icon.xs} color={theme.color.warning} />
            {/* ratingLabel says "New" for an unrated account rather than
                "0.0", which reads as a bad score and quietly penalises
                everyone who hasn't been rated yet. */}
            <Caption>{ratingLabel(user.ratingAvg, user.ratingCount)}</Caption>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={theme.layout.icon.md} color={theme.color.textFaint} />
      </PressableRow>

      {user.roles?.length > 0 && (
        <ListGroup title="Verification">
          {user.roles.map((role, i) => {
            const status = statusFor(role);
            return (
              <ListRow
                key={role}
                first={i === 0}
                icon="shield-checkmark-outline"
                label={ROLE_LABEL[role] || role}
                badge={
                  status ? (
                    <StatusBadge status={status} />
                  ) : (
                    <StatusBadge status="pending">Not started</StatusBadge>
                  )
                }
                onPress={() => router.push(`/(app)/profile/verification/${role}`)}
                accessibilityHint="Submit or review your verification documents"
              />
            );
          })}
        </ListGroup>
      )}

      <ListGroup title="Account">
        {ACCOUNT_ITEMS.map((item, i) => (
          <ListRow key={item.href} {...item} first={i === 0} onPress={() => router.push(item.href)} />
        ))}
      </ListGroup>

      <ListGroup title="Help">
        {HELP_ITEMS.map((item, i) => (
          <ListRow key={item.href} {...item} first={i === 0} onPress={() => router.push(item.href)} />
        ))}
      </ListGroup>

      <ListGroup title="More">
        {INFO_ITEMS.map((item, i) => (
          <ListRow key={item.href} {...item} first={i === 0} onPress={() => router.push(item.href)} />
        ))}
      </ListGroup>

      {/* Separated from the navigation groups above, and tinted, because it
          ends the session — it shouldn't sit in the same visual rhythm as
          "FAQ". */}
      <ListGroup>
        <ListRow first icon="log-out-outline" label="Log out" tone="danger" onPress={signOut} />
      </ListGroup>

      <Body style={styles.version}>TruckGee</Body>
    </Screen>
  );
};

const styles = StyleSheet.create({
  identityCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
  },
  identityContent: { paddingVertical: theme.spacing.md, gap: theme.spacing.smd },
  identityText: { flex: 1, gap: theme.spacing.xxs },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },

  signedOut: { alignItems: "center", gap: theme.spacing.smd, paddingVertical: theme.spacing.xl },
  signedOutIcon: {
    width: theme.spacing.giant,
    height: theme.spacing.giant,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surfaceRaised,
  },
  signedOutActions: { alignSelf: "stretch", gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  centred: { textAlign: "center" },

  version: { textAlign: "center", color: theme.color.textFaint },
});

export default ProfileScreen;
