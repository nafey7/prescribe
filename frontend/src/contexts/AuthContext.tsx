import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { baseApi } from "../api/baseApi";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  broadcastLogoutToOtherTabs,
  configureAuthSession,
  decodeJwtExp,
  ensureFreshAccessToken,
  REFRESH_TOKEN_STORAGE_KEY,
  subscribeLogoutFromOtherTabs,
} from "../api/authSession";
import { apiFetch, registerAccessTokenGetter } from "../api/client";
import { getApiBase } from "../api/env";
import { authInterruptNavigateTo, isPublicAuthSurfacePath } from "../router/authLanding";
import { paths } from "../router/paths";
import { store } from "../store";
import type { AuthSessionResponse, MeResponse, SignupInput } from "../types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

function readSessionAccess(): string {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function readSessionRefresh(): string {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeTokens(access: string, refresh: string): void {
  try {
    if (access) {
      sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, access);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
    if (refresh) {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
    } else {
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

interface AuthContextValue {
  user: MeResponse | null;
  status: AuthStatus;
  accessToken: string;
  login: (email: string, password: string) => Promise<MeResponse>;
  signup: (input: SignupInput) => Promise<MeResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [accessToken, setAccessToken] = useState(() => readSessionAccess());
  const [refreshToken, setRefreshToken] = useState(() => readSessionRefresh());
  const [user, setUser] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const accessRef = useRef(accessToken);
  const refreshRef = useRef(refreshToken);
  accessRef.current = accessToken;
  refreshRef.current = refreshToken;

  const navigateToLoginWithReturn = useCallback(() => {
    if (isPublicAuthSurfacePath(location.pathname)) {
      return;
    }
    navigate(authInterruptNavigateTo(location.pathname, location.search), {
      replace: true,
    });
  }, [location.pathname, location.search, navigate]);

  const clearSession = useCallback(() => {
    writeTokens("", "");
    accessRef.current = "";
    refreshRef.current = "";
    setAccessToken("");
    setRefreshToken("");
    setUser(null);
  }, []);

  useLayoutEffect(() => {
    configureAuthSession({
      getAccessToken: () => accessRef.current,
      getRefreshToken: () => refreshRef.current,
      onTokenPairRefreshed: (access, refresh) => {
        writeTokens(access, refresh);
        accessRef.current = access;
        refreshRef.current = refresh;
        setAccessToken(access);
        setRefreshToken(refresh);
      },
      clearSession,
      onRefreshFailed: navigateToLoginWithReturn,
    });
    return () => configureAuthSession(null);
  }, [clearSession, navigateToLoginWithReturn]);

  useEffect(() => {
    registerAccessTokenGetter(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    return subscribeLogoutFromOtherTabs(() => {
      clearSession();
      store.dispatch(baseApi.util.resetApiState());
      navigate(paths.root, { replace: true });
    });
  }, [clearSession, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const at = readSessionAccess();
      const rt = readSessionRefresh();
      if (!at && !rt) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("loading");

      const loadMe = async (): Promise<boolean> => {
        const res = await apiFetch("/auth/me");
        if (!res.ok) return false;
        const me = (await res.json()) as MeResponse;
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
        return true;
      };

      if (at) {
        setAccessToken(at);
        setRefreshToken(rt);
        accessRef.current = at;
        refreshRef.current = rt;
        if (await loadMe()) return;
      }

      if (rt) {
        refreshRef.current = rt;
        setRefreshToken(rt);
        const ok = await ensureFreshAccessToken();
        if (!cancelled && ok && (await loadMe())) return;
      }

      if (!cancelled) {
        clearSession();
        setStatus("unauthenticated");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const exp = decodeJwtExp(accessToken);
    if (exp == null) return;
    const ms = exp * 1000 - Date.now() - 60_000;
    const id = window.setTimeout(() => {
      void ensureFreshAccessToken();
    }, Math.max(ms, 5_000));
    return () => clearTimeout(id);
  }, [accessToken]);

  const applySession = useCallback((session: AuthSessionResponse) => {
    writeTokens(session.access_token, session.refresh_token);
    accessRef.current = session.access_token;
    refreshRef.current = session.refresh_token;
    setAccessToken(session.access_token);
    setRefreshToken(session.refresh_token);
    setUser(session.user);
    setStatus("authenticated");
    store.dispatch(baseApi.util.resetApiState());
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await store
        .dispatch(authApi.endpoints.login.initiate({ email, password }))
        .unwrap();
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const session = await store
        .dispatch(authApi.endpoints.signup.initiate(input))
        .unwrap();
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    const rt = refreshRef.current;
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt || null }),
      });
    } catch {
      /* ignore */
    }
    clearSession();
    broadcastLogoutToOtherTabs();
    store.dispatch(baseApi.util.resetApiState());
    navigate(paths.root, { replace: true });
  }, [clearSession, navigate]);

  const value = useMemo(
    () => ({
      user,
      status,
      accessToken,
      login,
      signup,
      logout,
    }),
    [user, status, accessToken, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
