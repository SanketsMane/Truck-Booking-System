import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
import { connectSocket, disconnectSocket } from "../api/socket";
import { listMyNotifications } from "../api/notifications";
import { listInbox } from "../api/chat";
import { describeNotification } from "../utils/notificationCopy";
import { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const navigate = useNavigate();
  const bouncedRef = useRef(false);
  // Notification ids already applied to unreadCount, so a "notification:read"
  // socket echo doesn't double-decrement in the tab that itself performed
  // the mark-read call (emitToUser broadcasts to every socket this user has
  // open, including the originating tab's — see clearUnreadCount/
  // decrementUnreadCount below).
  const readIdsRef = useRef(new Set());

  const refreshUser = useCallback(async () => {
    try {
      const { user: profile } = await authApi.getProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadSession = async () => {
      const profile = await refreshUser();
      if (!ignore) setLoading(false);
      return profile;
    };
    loadSession();

    return () => {
      ignore = true;
    };
  }, [refreshUser]);

  // A 401 from any authenticated call — not just the initial profile check —
  // means the session is gone (expired, logged out elsewhere, banned).
  // Someone who was never logged in getting a 401 on mount is expected and
  // shouldn't bounce/toast; someone who WAS logged in and suddenly isn't
  // should land back on /login with an explanation instead of being stuck
  // re-showing "Invalid token" on a broken page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser((prev) => {
        if (prev && !bouncedRef.current) {
          bouncedRef.current = true;
          toast.info("Your session has expired — please log in again");
          navigate("/login");
        }
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  // Connects the socket for the session, seeds the unread notification
  // count, and keeps it live from here — this is the one place "logged in"
  // and "subscribed to this user's real-time events" naturally belong
  // together, so any page can read unreadCount without its own socket
  // wiring. See Navbar/DashboardShell for the badge, Notifications.jsx for
  // clearing it.
  // Sum of each inbox conversation's unreadCount — kept live the same way
  // as unreadCount above, but recomputed via a real inbox fetch (rather
  // than a simple increment/decrement) whenever a thread gets marked read,
  // since "how many are still unread across every thread" isn't knowable
  // from a single event in isolation.
  const refreshChatUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { threads } = await listInbox();
      setChatUnreadCount((threads || []).reduce((sum, t) => sum + (t.unreadCount || 0), 0));
    } catch {
      // Leave the last known count in place on failure.
    }
  }, [user]);

  // id is optional so callers with nothing to key off of (none today) still
  // work; when given, a second call for the same id is a no-op — that's
  // what keeps the originating tab's own optimistic update from being
  // double-applied when its own "notification:read" echo arrives.
  const decrementUnreadCount = useCallback((notificationId) => {
    if (notificationId != null) {
      if (readIdsRef.current.has(notificationId)) return;
      readIdsRef.current.add(notificationId);
    }
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);
  const clearUnreadCount = useCallback(() => {
    readIdsRef.current.clear();
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      setChatUnreadCount(0);
      return undefined;
    }

    const socket = connectSocket();
    bouncedRef.current = false;

    let cancelled = false;
    listMyNotifications({ unreadOnly: true })
      .then(({ notifications }) => {
        if (!cancelled) setUnreadCount(notifications?.length || 0);
      })
      .catch(() => {});
    refreshChatUnreadCount();

    const handleNewNotification = (n) => {
      setUnreadCount((count) => count + 1);
      if (n.type === "new_chat_message") setChatUnreadCount((count) => count + 1);
      const { text, to } = describeNotification(n);
      toast.info(text, to ? { onClick: () => navigate(to) } : undefined);
    };
    // Cross-tab sync: another tab of this same user marking a notification
    // (or all of them) read should drop this tab's badge too, not just the
    // tab that performed the action — see notificationController.js's
    // markRead/markAllRead, which emit these after the DB write.
    const handleNotificationRead = ({ notificationId } = {}) => decrementUnreadCount(notificationId);
    const handleAllNotificationsRead = () => clearUnreadCount();

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:allRead", handleAllNotificationsRead);

    return () => {
      cancelled = true;
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:allRead", handleAllNotificationsRead);
    };
  }, [user, navigate, refreshChatUnreadCount, decrementUnreadCount, clearUnreadCount]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    setUser,
    loading,
    refreshUser,
    logout,
    unreadCount,
    clearUnreadCount,
    decrementUnreadCount,
    chatUnreadCount,
    refreshChatUnreadCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export default AuthContext;
