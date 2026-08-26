import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { useAuth } from "../../../src/context/AuthContext";

const NAV_ITEMS = [
  { href: "/(app)/profile/edit", label: "Personal info" },
  { href: "/(app)/profile/password", label: "Password" },
  { href: "/(app)/profile/roles", label: "Roles" },
  { href: "/(app)/profile/notification-settings", label: "Notifications" },
  { href: "/(app)/support", label: "Support" },
  { href: "/(app)/disputes", label: "Disputes" },
];

export const ProfileScreen = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>{user?.name}</PageTitle>
        <Muted>{user?.email}</Muted>
        {user?.ratingAvg != null && <Muted>★ {user.ratingAvg.toFixed(1)} · {user.ratingCount} ratings</Muted>}
      </View>

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

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Button key={item.href} title={item.label} variant="secondary" onPress={() => router.push(item.href)} fullWidth />
        ))}
      </View>

      <Button title="Log out" variant="ghost" onPress={signOut} fullWidth />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nav: { gap: theme.space(2) },
});

export default ProfileScreen;
