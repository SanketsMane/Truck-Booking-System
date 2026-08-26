import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { useAuth } from "../../../src/context/AuthContext";

const NAV_ITEMS = [
  { href: "/(app)/profile/edit", label: "Personal info" },
  { href: "/(app)/profile/password", label: "Password" },
  { href: "/(app)/profile/roles", label: "Roles" },
  { href: "/(app)/profile/notification-settings", label: "Notifications" },
  { href: "/(app)/profile/devices", label: "Manage devices" },
  { href: "/(app)/support", label: "Support" },
  { href: "/(app)/disputes", label: "Disputes" },
];

// Public regardless of login state — same links the web footer exposes to
// every visitor.
const INFO_ITEMS = [
  { href: "/(app)/about", label: "About TruckGee" },
  { href: "/(app)/for-shippers", label: "For Shippers" },
  { href: "/(app)/help", label: "Help center" },
  { href: "/(app)/faq", label: "FAQ" },
  { href: "/(app)/content/blog", label: "Blog" },
  { href: "/(app)/content/news", label: "News" },
  { href: "/(app)/content/update", label: "Product updates" },
  { href: "/(app)/terms", label: "Terms of Service" },
  { href: "/(app)/privacy", label: "Privacy Policy" },
];

const NavList = ({ items, router }) => (
  <View style={styles.nav}>
    {items.map((item) => (
      <Button key={item.href} title={item.label} variant="secondary" onPress={() => router.push(item.href)} fullWidth />
    ))}
  </View>
);

export const ProfileScreen = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <Screen>
      {user ? (
        <View style={styles.header}>
          <PageTitle>{user.name}</PageTitle>
          <Muted>{user.email}</Muted>
          {user.ratingAvg != null && <Muted>★ {user.ratingAvg.toFixed(1)} · {user.ratingCount} ratings</Muted>}
        </View>
      ) : (
        <Card style={styles.loggedOutCard}>
          <SectionTitle>You’re not signed in</SectionTitle>
          <Body style={styles.loggedOutBody}>Log in or create a free account to book, post trips, and chat.</Body>
          <Button title="Log in" onPress={() => router.push("/(auth)/login")} fullWidth />
          <Button title="Create an account" variant="secondary" onPress={() => router.push("/(auth)/signup")} fullWidth />
        </Card>
      )}

      {user?.roles?.map((role) => (
        <Card key={role}>
          <View style={styles.rowBetween}>
            <Body>{role === "transporter" ? "Driver verification" : "Shipper verification"}</Body>
            <Button
              title="Manage"
              variant="secondary"
              onPress={() => router.push(`/(app)/profile/verification/${role}`)}
            />
          </View>
        </Card>
      ))}

      {user && <NavList items={NAV_ITEMS} router={router} />}

      <View style={styles.section}>
        <SectionTitle style={styles.sectionTitle}>More</SectionTitle>
        <NavList items={INFO_ITEMS} router={router} />
      </View>

      {user && <Button title="Log out" variant="ghost" onPress={signOut} fullWidth />}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  loggedOutCard: { gap: theme.space(3) },
  loggedOutBody: { color: theme.color.textMuted },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nav: { gap: theme.space(2) },
  section: { gap: theme.space(2) },
  sectionTitle: { fontSize: theme.font.size.md },
});

export default ProfileScreen;
