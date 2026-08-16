import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getThreadForBooking, listMessages, sendMessage, markThreadRead } from "../api/chat";
import { getSocket, joinThread, leaveThread } from "../api/socket";

// Shared real-time chat engine behind both the booking-detail chat panel
// and the dedicated /chat pages — pass exactly one of bookingId (resolves
// the thread via the booking) or threadId (thread already known, e.g. from
// the inbox list). Extracted so both call sites get identical behavior
// (history load, read-receipt seeding, live socket updates, optimistic
// send) instead of drifting apart over time.
export const useChatThread = ({ bookingId, threadId } = {}) => {
  const { user, refreshChatUnreadCount } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // Latest instant the counterparty is known to have read up to — a message
  // I sent counts as "read" once its createdAt falls at or before this.
  const [otherReadAt, setOtherReadAt] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setThread(null);
    setMessages([]);
    setOtherReadAt(null);
    (async () => {
      try {
        const resolvedThread = bookingId ? (await getThreadForBooking(bookingId)).thread : { _id: threadId };
        if (!resolvedThread?._id) throw new Error("No thread");
        if (cancelled) return;
        const { messages: history } = await listMessages(resolvedThread._id);
        if (cancelled) return;
        setMessages(history);
        setThread(resolvedThread);

        const latestRead = history
          .flatMap((m) => m.readBy || [])
          .map((r) => new Date(r.readAt))
          .sort((a, b) => b - a)[0];
        if (latestRead) setOtherReadAt(latestRead);

        // Opening the thread IS reading it — mark it read immediately, and
        // resync the sidebar's unread badge to match.
        markThreadRead(resolvedThread._id)
          .then(() => refreshChatUnreadCount())
          .catch(() => {});
      } catch {
        // No thread available — panel stays empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, threadId, refreshChatUnreadCount]);

  useEffect(() => {
    if (!thread) return undefined;
    joinThread(thread._id);
    const socket = getSocket();
    const handler = (message) => {
      if (String(message.thread) !== String(thread._id)) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      if (String(message.sender) !== String(user?.id)) {
        markThreadRead(thread._id)
          .then(() => refreshChatUnreadCount())
          .catch(() => {});
      }
    };
    const readHandler = ({ threadId: incomingThreadId, readerId, readAt }) => {
      if (String(incomingThreadId) !== String(thread._id) || String(readerId) === String(user?.id)) return;
      setOtherReadAt(new Date(readAt));
    };
    socket?.on("chat:message", handler);
    socket?.on("chat:read", readHandler);
    return () => {
      socket?.off("chat:message", handler);
      socket?.off("chat:read", readHandler);
      leaveThread(thread._id);
    };
  }, [thread, user?.id, refreshChatUnreadCount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = useCallback(
    async ({ text, imageUrl }) => {
      if (!thread || (!text?.trim() && !imageUrl)) return;
      setSending(true);
      try {
        const { message } = await sendMessage(thread._id, { text: text?.trim(), imageUrl });
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      } finally {
        setSending(false);
      }
    },
    [thread]
  );

  return { thread, messages, loading, sending, otherReadAt, send, messagesEndRef, user };
};

export default useChatThread;
