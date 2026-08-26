import { useEffect, useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { listNotificationCategories } from "../../../src/api/notifications";
import { updateProfile } from "../../../src/api/auth";
import { registerDevice } from "../../../src/api/push";
import { useAuth } from "../../../src/context/AuthContext";

// Same per-category on/off model as the web app's NotificationPreferencesCard
// (fetched from the same /notifications/categories, saved through the same
// PUT /auth/profile field) — plus the mobile-only step of actually
// registering this device's FCM token (see backend/utils/fcmPush.js and
// deviceTokenModel.js), which the web app's browser-Web-Push equivalent
// doesn't need.
export const NotificationSettingsScreen = () => {
  const { user, setUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [prefs, setPrefs] = useState(user?.notificationPreferences || {});
  const [enabling, setEnabling] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listNotificationCategories()
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const handleEnablePush = async () => {
    setEnabling(true);
    setError("");
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Notification permission was denied");
        return;
      }
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const token = await Notifications.getDevicePushTokenAsync();
      await registerDevice({ token: token.data, platform: Platform.OS === "ios" ? "ios" : "android" });
      setPushEnabled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnabling(false);
    }
  };

  const toggleCategory = async (key) => {
    const next = { ...prefs, [key]: prefs[key] === false ? true : false };
    setPrefs(next);
    try {
      const res = await updateProfile({ notificationPreferences: next });
      setUser(res.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Screen>
      <PageTitle>Notifications</PageTitle>

      <Card>
        <SectionTitle>Push notifications</SectionTitle>
        <Muted>{pushEnabled ? "Enabled on this device." : "Get notified about bookings, chat, and verification updates."}</Muted>
        {!pushEnabled && <Button title="Enable" onPress={handleEnablePush} loading={enabling} fullWidth />}
      </Card>

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <Card>
        <SectionTitle>By category</SectionTitle>
        {categories.map((cat) => (
          <Pressable key={cat.key} style={styles.row} onPress={() => toggleCategory(cat.key)}>
            <Body>{cat.label}</Body>
            <View style={[styles.toggle, prefs[cat.key] !== false && styles.toggleOn]}>
              <Text style={styles.toggleText}>{prefs[cat.key] !== false ? "On" : "Off"}</Text>
            </View>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  error: { color: theme.color.danger },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  toggle: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: theme.radius.pill, backgroundColor: theme.color.surfaceRaised },
  toggleOn: { backgroundColor: theme.color.accentSoft },
  toggleText: { fontSize: theme.font.size.xs, color: theme.color.textMuted },
});

export default NotificationSettingsScreen;
