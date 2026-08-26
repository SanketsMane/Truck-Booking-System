import { useEffect, useRef, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../../src/components/ui/Typography";
import { TextField } from "../../../src/components/ui/TextField";
import { Button } from "../../../src/components/ui/Button";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { getThread, getThreadForBooking, listMessages, sendMessage, markThreadRead } from "../../../src/api/chat";
import { connectSocket } from "../../../src/utils/socket";
import { formatDateTime } from "../../../src/utils/format";
import { useAuth } from "../../../src/context/AuthContext";

export const ChatThreadScreen = () => {
  const { threadId: routeParam } = useLocalSearchParams();
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);

  // Booking Detail links here as "booking-<id>" when it doesn't yet know
  // the thread id (a thread is created lazily on first message in some
  // flows) — resolve via the booking instead of a plain thread lookup.
  const isBookingRef = routeParam?.startsWith("booking-");
  const bookingId = isBookingRef ? routeParam.replace("booking-", "") : null;

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const load = isBookingRef ? getThreadForBooking(bookingId) : getThread(routeParam);
      load
        .then(async (res) => {
          setThread(res.thread);
          const msgs = await listMessages(res.thread._id);
          setMessages(msgs.messages || []);
          markThreadRead(res.thread._id).catch(() => {});
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParam]);

  useEffect(() => {
    if (!thread) return undefined;
    let active = true;
    connectSocket().then((socket) => {
      if (!active || !socket) return;
      socketRef.current = socket;
      socket.emit("chat:join", { threadId: thread._id });
      socket.on("chat:message", (message) => {
        if (String(message.thread) === String(thread._id)) setMessages((prev) => [...prev, message]);
      });
    });
    return () => {
      active = false;
      socketRef.current?.emit("chat:leave", { threadId: thread._id });
      socketRef.current?.off("chat:message");
    };
  }, [thread]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(thread._id, { text: text.trim() });
      setText("");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingView />;
  if (!thread) return <Screen><Muted>Conversation not found</Muted></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <PageTitle>{thread.counterparty?.name}</PageTitle>
        <Muted>{thread.trip ? `${thread.trip.fromCity} → ${thread.trip.toCity}` : ""}</Muted>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => {
          const mine = String(item.sender?._id || item.sender) === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Muted style={mine ? styles.bubbleTextMine : undefined}>{item.text}</Muted>
              <Muted style={styles.timestamp}>{formatDateTime(item.createdAt)}</Muted>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextField value={text} onChangeText={setText} placeholder="Type a message" style={styles.input} />
        <Button title="Send" onPress={handleSend} loading={sending} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { padding: theme.space(4), paddingBottom: 0, gap: 4 },
  messages: { padding: theme.space(4), gap: theme.space(2) },
  bubble: { maxWidth: "80%", padding: 10, borderRadius: theme.radius.sm },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: theme.color.accent },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: theme.color.surfaceRaised },
  bubbleTextMine: { color: theme.color.onAccent },
  timestamp: { fontSize: 10, marginTop: 4 },
  composer: { flexDirection: "row", gap: 8, padding: theme.space(4), alignItems: "flex-end" },
  input: { flex: 1 },
});

export default ChatThreadScreen;
