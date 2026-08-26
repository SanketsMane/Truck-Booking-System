import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getProfile } from "../api/auth";
import { getStoredTokens, clearTokens, setUnauthorizedHandler } from "../api/client";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

// Mirrors frontend/src/context/AuthContext.jsx's role in the web app:
// single source of truth for "who's logged in," backed here by secure
// on-device token storage instead of the browser's cookie jar. Screens that
// complete a login/signup/OTP-verify call api/auth.js directly (which
// already persists the returned tokens) and then call setUser() here —
// this context doesn't own the multi-step OTP state machine itself, only
// the resulting session.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Avoids setUser(null) firing twice (once from the 401 handler, once from
  // an explicit signOut() the same screen already triggered).
  const signingOutRef = useRef(false);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      const { refreshToken } = await getStoredTokens();
      await authApi.logout(refreshToken);
    } catch {
      await clearTokens();
    } finally {
      setUser(null);
      signingOutRef.current = false;
    }
  }, []);

  useEffect(() => {
    // A 401 that survives client.js's own silent-refresh-and-retry means
    // the refresh token itself is dead (expired/revoked/reused) — there's
    // no session left to recover, so just clear local state. (app) stays
    // mounted either way (see app/_layout.js); any screen gated by
    // AuthRequired re-renders its login prompt on its own.
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { accessToken, refreshToken } = await getStoredTokens();
        if (!accessToken && !refreshToken) {
          setLoading(false);
          return;
        }
        const res = await getProfile();
        setUser(res.user);
      } catch {
        await clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export default AuthContext;
