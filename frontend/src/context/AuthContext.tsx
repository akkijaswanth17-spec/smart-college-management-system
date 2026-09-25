import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { AuthUser } from "../types";
import * as authService from "../services/auth.service";
import { api } from "../services/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (role?: string) => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The session lives in one browser-wide cookie, so logging in as someone else
  // in another tab silently swaps the account behind this tab too — every
  // request then fails with 401/403. Detect that (on tab focus, or when a
  // request is rejected) and move this tab to whoever is actually signed in.
  const userRef = useRef(user);
  userRef.current = user;
  useEffect(() => {
    let switching = false;
    const checkSessionChanged = async () => {
      const current = userRef.current;
      if (!current || switching) return;
      let me: AuthUser | null = null;
      try {
        me = await authService.getMe();
      } catch {
        me = null;
      }
      if (me?.id === current.id || switching) return;
      switching = true;
      window.alert(
        me
          ? `You signed in as a different account (${me.email}) in another tab. This tab will switch to that account.`
          : "You were signed out in another tab. Please sign in again."
      );
      window.location.assign(me ? `/${me.role.toLowerCase()}` : "/");
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") checkSessionChanged();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interceptor = api.interceptors.response.use(undefined, (error) => {
      const status = error?.response?.status;
      if ((status === 401 || status === 403) && !String(error?.config?.url ?? "").startsWith("/auth/")) {
        checkSessionChanged();
      }
      return Promise.reject(error);
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authService.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async (role?: string) => {
    await authService.logout(role);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
