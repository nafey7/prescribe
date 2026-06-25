import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "../api/client";
import { clearStoredTokens, getStoredTokens, storeTokens } from "./tokenStorage";
import type {
  AuthSessionResponse,
  AuthStatus,
  LoginInput,
  MeResponse,
  SignupInput,
  TokenPair,
} from "./types";

type AuthContextValue = {
  accessToken: string | null;
  status: AuthStatus;
  user: MeResponse | null;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<MeResponse | null>(null);

  const applySession = useCallback(async (session: AuthSessionResponse) => {
    await storeTokens(session);
    setAccessToken(session.access_token);
    setRefreshToken(session.refresh_token);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(async () => {
    await clearStoredTokens();
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const loadMe = useCallback(async (token: string) => {
    const me = await apiRequest<MeResponse>("/auth/me", { accessToken: token });
    setUser(me);
    setAccessToken(token);
    setStatus("authenticated");
  }, []);

  const refreshSession = useCallback(async (token: string) => {
    const tokenPair = await apiRequest<TokenPair>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: token }),
    });
    await storeTokens(tokenPair);
    setAccessToken(tokenPair.access_token);
    setRefreshToken(tokenPair.refresh_token);
    return tokenPair.access_token;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = await getStoredTokens();
      if (cancelled) return;

      if (!stored.accessToken && !stored.refreshToken) {
        setStatus("unauthenticated");
        return;
      }

      try {
        if (stored.accessToken) {
          await loadMe(stored.accessToken);
          return;
        }

        if (stored.refreshToken) {
          const nextAccessToken = await refreshSession(stored.refreshToken);
          await loadMe(nextAccessToken);
          return;
        }
      } catch {
        await clearSession();
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, loadMe, refreshSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      setStatus("loading");
      try {
        const session = await apiRequest<AuthSessionResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await applySession(session);
      } catch (error) {
        setStatus(user ? "authenticated" : "unauthenticated");
        throw error;
      }
    },
    [applySession, user]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      setStatus("loading");
      try {
        const session = await apiRequest<AuthSessionResponse>("/auth/signup", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await applySession(session);
      } catch (error) {
        setStatus(user ? "authenticated" : "unauthenticated");
        throw error;
      }
    },
    [applySession, user]
  );

  const logout = useCallback(async () => {
    const token = refreshToken;
    try {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: token }),
      });
    } catch {
      /* Logout is local-first and idempotent. */
    } finally {
      await clearSession();
    }
  }, [clearSession, refreshToken]);

  const value = useMemo(
    () => ({
      accessToken,
      status,
      user,
      login,
      signup,
      logout,
    }),
    [accessToken, status, user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
