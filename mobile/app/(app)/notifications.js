import { useCallback, useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { theme } from "../../src/theme";
import { listMyNotifications, markNotificationRead, markAllNotificationsRead } from "../../src/api/notifications";
import { formatDateTime } from "../../src/utils/format";

// A Notification document only stores {type, payload} (the raw event
// data) — the body/url copy itself is computed, not stored, same as
// backend/utils/notify.js's pushCopy() does at push-send time. Mirrors
// that exact switch so what a push notification said and what this list
// shows for the same event always match; unmapped types fall back to the
// same de-underscored type string pushCopy()'s own default does.
const describe = (type, payload = {}) => {
  switch (type) {
    case "new_booking_request":
      return { body: "New booking request on your trip", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_confirmed":
      return { body: "Your booking was confirmed", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_rejected":
      return { body: `Your booking was rejected${payload.reason ? ` — ${payload.reason}` : ""}`, url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_expired":
      return { body: "A booking request expired", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_cancelled":
      return { body: "A booking was cancelled", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_pickup_confirmed":
      return { body: "Pickup was confirmed for your booking", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "booking_completed":
      return { body: "Your booking is complete", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "rating_prompt":
      return { body: "Rate how your recent trip went", url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "new_rating":
      return { body: `You received a ${payload.stars}-star rating`, url: payload.bookingId && `/bookings/${payload.bookingId}` };
    case "new_chat_message":
      return { body: "New message", url: payload.threadId && `/chat/${payload.threadId}` };
    case "saved_search_match":
      return { body: `New trip found: ${payload.fromCity || "?"} → ${payload.toCity || "?"}`, url: payload.tripId && `/trips/${payload.tripId}` };
    case "truck_status_changed":
      return { body: `Truck ${payload.regNumber || ""} is now ${payload.status}`.trim(), url: "/trucks" };
    case "trip_auto_published":
      return { body: `Your trip ${payload.fromCity || "?"} → ${payload.toCity || "?"} is now live`, url: payload.tripId && `/trips/${payload.tripId}/manage` };
    case "trip_expired":
      return { body: `Your trip ${payload.fromCity || "?"} → ${payload.toCity || "?"} expired with no bookings`, url: payload.tripId && `/trips/${payload.tripId}/manage` };
    case "verification_status_changed":
      return { body: `Your ${payload.type || ""} verification is now ${payload.status}`.trim(), url: "/profile" };
    case "account_status_changed":
      return { body: `Your account status changed to ${payload.status}`, url: "/profile" };
    case "dispute_raised":
      return { body: "A dispute was raised on one of your bookings", url: "/disputes" };
    case "dispute_resolved":
      return { body: `Your dispute was ${payload.status || "resolved"}`, url: "/disputes" };
    default:
      return { body: type?.replace(/_/g, " ") || "Notification", url: "/notifications" };
  }
};

export const NotificationsScreen = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listMyNotifications()
      .then((res) => setItems(res.notifications || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePress = async (n) => {
    if (!n.read) await markNotificationRead(n._id).catch(() => {});
    const { url } = describe(n.type, n.payload);
    if (url) router.push(`/(app)${url}`);
    load();
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <PageTitle>Notifications</PageTitle>
        <Button title="Mark all read" variant="ghost" onPress={() => markAllNotificationsRead().then(load)} />
      </View>

      {loading ? (
        <LoadingView />
      ) : items.length === 0 ? (
        <EmptyState>You’re all caught up.</EmptyState>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => handlePress(item)} style={[styles.row, !item.read && styles.unread]}>
              <Body>{describe(item.type, item.payload).body}</Body>
              <Muted>{formatDateTime(item.sentAt)}</Muted>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(2) },
  row: { padding: theme.space(3), borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.color.border, gap: 4 },
  unread: { backgroundColor: theme.color.accentSoft, borderColor: theme.color.accent },
});

export default NotificationsScreen;
