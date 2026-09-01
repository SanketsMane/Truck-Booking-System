import { useCallback, useEffect, useState } from "react";
import { View, Switch, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/components/ui/Screen";
import { Body, BodyStrong, Muted, Caption } from "../../../src/components/ui/Typography";
import { Card, Section } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { SkeletonList } from "../../../src/components/ui/Skeleton";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { theme } from "../../../src/theme";
import { listNotificationCategories } from "../../../src/api/notifications";
import { updateProfile } from "../../../src/api/auth";
import { registerDevice } from "../../../src/api/push";
import { useAuth } from "../../../src/context/AuthContext";

// expo-notifications is loaded lazily, NOT at module scope. Its push module
// throws on import inside Expo Go (push was removed from Expo Go in SDK 53),
// and expo-router eagerly loads every route file on launch — so a top-level
// import here took the ENTIRE app down with an uncaught error before the
// first screen rendered, whether or not anyone opened this page. Requiring it
// at the moment it's actually needed keeps the app running in Expo Go and
// changes nothing in a real build, where the native module is present.
const loadNotifications = () => {
  try {
    return require("expo-notifications");
  } catch {
    return null;
  }
};

// Same per-category on/off model as the web app's NotificationPreferencesCard
// (fetched from the same /notifications/categories, saved through the same
// PUT /auth/profile field) — plus the mobile-only step of registering this
// device's FCM token (backend/utils/fcmPush.js, deviceTokenModel.js), which
// the web app's Web Push equivalent doesn't need.
export const NotificationSettingsScreen = () => {
  const { user, setUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [prefs, setPrefs] = useState(user?.notificationPreferences || {});
  const [enabling, setEnabling] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listNotificationCategories()
      .then((res) => {
        if (cancelled) return;
        setCategories(res.categories || []);
        setStatus("ready");
      })
      // Was `.catch(() => setCategories([]))`, which rendered a failed
      // request as "this account has no notification categories".
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retry = useCallback(() => {
    setLoadError("");
    setStatus("loading");
    setReloadToken((t) => t + 1);
  }, []);

  const handleEnablePush = async () => {
    const Notifications = loadNotifications();
    if (!Notifications) {
      setError("Push notifications need the full app — they aren't available in Expo Go.");
      return;
    }
    setEnabling(true);
    setError("");
    try {
      const { status: permission } = await Notifications.requestPermissionsAsync();
      if (permission !== "granted") {
        // Says what to do about it. "Permission denied" alone leaves the
        // user stuck, because the OS won't ask a second time.
        setError("Notifications are blocked. Turn them on for TruckGee in your device settings, then try again.");
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

  const toggleCategory = async (key, value) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    // Optimistic: the switch moves under the finger immediately, and rolls
    // back if the save fails. Waiting on the round trip makes a toggle feel
    // broken on a slow connection.
    setPrefs(next);
    setError("");
    try {
      const res = await updateProfile({ notificationPreferences: next });
      setUser(res.user);
    } catch (err) {
      setPrefs(previous);
      setError(err.message);
    }
  };

  return (
    <Screen title="Notifications">

      <Card>
        <View style={styles.pushRow}>
          <View style={styles.pushIcon}>
            <Ionicons
              name={pushEnabled ? "notifications" : "notifications-outline"}
              size={theme.layout.icon.lg}
              color={pushEnabled ? theme.color.accent : theme.color.textFaint}
            />
          </View>
          <View style={styles.pushText}>
            <BodyStrong>Push notifications</BodyStrong>
            <Muted>
              {pushEnabled
                ? "Enabled on this device."
                : "Get told about bookings, chat and verification the moment they happen."}
            </Muted>
          </View>
        </View>
        {!pushEnabled && <Button title="Enable" onPress={handleEnablePush} loading={enabling} fullWidth />}
      </Card>

      {error ? <Caption style={styles.error}>{error}</Caption> : null}

      <Section title="By category" subtitle="Turn off anything you'd rather not hear about.">
        {status === "loading" && <SkeletonList count={3} />}
        {status === "error" && (
          <ErrorState compact title="Couldn't load your categories" message={loadError} onRetry={retry} />
        )}
        {status === "ready" && categories.length === 0 && <Muted>No categories to configure.</Muted>}
        {status === "ready" && categories.length > 0 && (
          <Card variant="flat" padded={false}>
            {categories.map((cat, i) => (
              <View key={cat.key} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Body style={styles.rowLabel}>{cat.label}</Body>
                {/* A real Switch, not a View styled to look like a pill
                    reading "On"/"Off" — that version announced as plain text
                    to a screen reader, gave no platform feel, and sat on a
                    ~32dp row well under the touch floor. */}
                <Switch
                  value={prefs[cat.key] !== false}
                  onValueChange={(v) => toggleCategory(cat.key, v)}
                  trackColor={{ false: theme.color.border, true: theme.color.accentSoft }}
                  thumbColor={prefs[cat.key] !== false ? theme.color.accent : theme.color.surface}
                  accessibilityLabel={cat.label}
                />
              </View>
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
};

const styles = StyleSheet.create({
  pushRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.smd },
  pushIcon: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surfaceRaised,
  },
  pushText: { flex: 1, gap: theme.spacing.xxs },

  error: { color: theme.color.danger },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.smd,
    minHeight: theme.layout.row.single,
    paddingHorizontal: theme.spacing.md,
  },
  rowDivider: { borderTopWidth: theme.layout.hairline, borderTopColor: theme.color.border },
  rowLabel: { flex: 1 },
});

export default NotificationSettingsScreen;
