import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
import { connectSocket, disconnectSocket } from "../api/socket";
import { listMyNotifications } from "../api/notifications";
import { describeNotification } from "../utils/notificationCopy";
import { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const bouncedRef = useRef(false);

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
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
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

    const handleNewNotification = (n) => {
      setUnreadCount((count) => count + 1);
      const { text, to } = describeNotification(n);
      toast.info(text, to ? { onClick: () => navigate(to) } : undefined);
    };
    socket.on("notification:new", handleNewNotification);

    return () => {
      cancelled = true;
      socket.off("notification:new", handleNewNotification);
    };
  }, [user, navigate]);

  const clearUnreadCount = useCallback(() => setUnreadCount(0), []);
  const decrementUnreadCount = useCallback(() => setUnreadCount((count) => Math.max(0, count - 1)), []);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export default AuthContext;
