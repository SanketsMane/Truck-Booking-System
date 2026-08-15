import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
import { connectSocket, disconnectSocket } from "../api/socket";
import { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (user) {
      connectSocket();
      bouncedRef.current = false;
    } else {
      disconnectSocket();
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = { user, setUser, loading, refreshUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export default AuthContext;
