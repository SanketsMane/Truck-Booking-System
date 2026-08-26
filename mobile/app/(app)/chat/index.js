import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listInbox } from "../../../src/api/chat";
import { connectSocket } from "../../../src/utils/socket";
import { formatDateTime } from "../../../src/utils/format";

export const ChatInboxScreen = () => {
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listInbox()
      .then((res) => setThreads(res.threads || []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // A live refresh on any new message/notification while the inbox is open —
  // same "new_chat_message"/"booking_confirmed" triggers ChatInbox.jsx
  // refetches on, via the personal notification:new stream rather than
  // joining every thread room at once just to keep a list view current.
  useEffect(() => {
    let socket;
    connectSocket().then((s) => {
      socket = s;
      socket?.on("notification:new", load);
    });
    return () => socket?.off("notification:new", load);
  }, [load]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <PageTitle>Chat</PageTitle>
      </View>

      {loading ? (
        <LoadingView />
      ) : threads.length === 0 ? (
        <EmptyState>No conversations yet.</EmptyState>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/chat/${item._id}`)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Body>{item.counterparty?.name}</Body>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Body style={styles.unreadText}>{item.unreadCount}</Body>
                    </View>
                  )}
                </View>
                <Muted>{item.trip ? `${item.trip.fromCity} → ${item.trip.toCity}` : ""}</Muted>
                <Muted>{item.lastMessageAt ? formatDateTime(item.lastMessageAt) : ""}</Muted>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  unreadBadge: {
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadText: { color: theme.color.onAccent, fontSize: theme.font.size.xs },
});

export default ChatInboxScreen;
