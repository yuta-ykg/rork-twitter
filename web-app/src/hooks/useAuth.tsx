import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ACTING_KEY } from "@/lib/supabase";
import { listSubAccounts, type SubAccount } from "@/lib/subAccounts";
import { AuthContext } from "@/hooks/authContext";
import type { AuthUser } from "@/hooks/authUser";

const AUTH_URL = import.meta.env.EXPO_PUBLIC_RORK_AUTH_URL as string;
const APP_KEY = import.meta.env.EXPO_PUBLIC_RORK_APP_KEY as string;

const ACCESS_TOKEN_KEY = "rork:access_token";
const REFRESH_TOKEN_KEY = "rork:refresh_token";
const CODE_VERIFIER_KEY = "rork:pkce_verifier";

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const ACCOUNTS_KEY = "rork:accounts";

interface StoredAccount {
  user: AuthUser;
  access: string;
  refresh: string;
}

function readAccounts(): StoredAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.user?.id && item.refresh) : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: StoredAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

function upsertAccount(account: StoredAccount): AuthUser[] {
  const next = [...readAccounts().filter((item) => item.user.id !== account.user.id), account];
  writeAccounts(next);
  return next.map((item) => item.user);
}

function userFromToken(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // atobはLatin-1を返すため、バイト列経由でUTF-8としてデコードする（日本語名の文字化け対策）。
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: string; email?: string; name?: string; picture?: string; exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (!payload.sub) return null;
    return { id: payload.sub, email: payload.email ?? "", name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

interface ActingStored {
  owner: string;
  id: string;
  name: string;
  picture?: string;
}

function readActing(): ActingStored | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTING_KEY) ?? "null") as ActingStored | null;
    return parsed?.id && parsed.owner ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loginUser, setUser] = useState<AuthUser | null>(null);
  const [acting, setActing] = useState<ActingStored | null>(readActing);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const user = useMemo<AuthUser | null>(() => {
    if (!loginUser) return null;
    if (acting && acting.owner === loginUser.id) return { id: acting.id, email: "", name: acting.name, picture: acting.picture };
    return loginUser;
  }, [loginUser, acting]);

  const switchPersona = useCallback((sub: SubAccount | null) => {
    if (!sub || !loginUser) {
      localStorage.removeItem(ACTING_KEY);
      setActing(null);
      return;
    }
    const next: ActingStored = { owner: loginUser.id, id: sub.id, name: sub.name, picture: sub.avatarUrl ?? undefined };
    localStorage.setItem(ACTING_KEY, JSON.stringify(next));
    setActing(next);
  }, [loginUser]);

  const reloadSubAccounts = useCallback(async (): Promise<void> => {
    if (!loginUser) {
      setSubAccounts([]);
      return;
    }
    try {
      const list = await listSubAccounts();
      setSubAccounts(list);
      const current = readActing();
      if (!current || current.owner !== loginUser.id) return;
      const match = list.find((item) => item.id === current.id);
      if (!match) {
        localStorage.removeItem(ACTING_KEY);
        setActing(null);
      } else if (match.name !== current.name || (match.avatarUrl ?? undefined) !== current.picture) {
        const next: ActingStored = { ...current, name: match.name, picture: match.avatarUrl ?? undefined };
        localStorage.setItem(ACTING_KEY, JSON.stringify(next));
        setActing(next);
      }
    } catch {
      // 一覧を取得できなくても、メインアカウントでの利用は続けられる。
    }
  }, [loginUser]);

  useEffect(() => {
    if (loginUser && acting && acting.owner !== loginUser.id) {
      localStorage.removeItem(ACTING_KEY);
      setActing(null);
    }
    void reloadSubAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginUser?.id]);
  const [accounts, setAccounts] = useState<AuthUser[]>(() => readAccounts().map((item) => item.user));
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener("message", messageListenerRef.current);
        messageListenerRef.current = null;
      }
    };
  }, []);

  async function exchangeCode(code: string) {
    const verifier = localStorage.getItem(CODE_VERIFIER_KEY);
    if (!verifier) {
      setError("ログイン情報が見つかりません。もう一度試してください。");
      return;
    }
    localStorage.removeItem(CODE_VERIFIER_KEY);
    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "ログインに失敗しました");
      return;
    }
    const { access_token, refresh_token, user: userData } = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      user: AuthUser;
    };
    localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    const decoded = userFromToken(access_token) ?? userData;
    setAccounts(upsertAccount({ user: decoded, access: access_token, refresh: refresh_token }));
    setUser(decoded);
  }

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      localStorage.setItem(CODE_VERIFIER_KEY, verifier);
      const isPreview = window.parent !== window;
      const body: Record<string, unknown> = {
        app_key: APP_KEY,
        provider,
        code_challenge: challenge,
        target: "web",
        env: isPreview ? "preview" : "production",
      };
      if (isPreview) body.app_path = "web-app";

      const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        localStorage.removeItem(CODE_VERIFIER_KEY);
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
        setError(errorBody.error || "ログインに失敗しました");
        return;
      }
      const { auth_url } = (await response.json()) as { auth_url: string };
      if (isPreview) {
        const popup = window.open(auth_url, "_blank", "width=500,height=650");
        if (!popup) {
          setError("ポップアップがブロックされました。許可してからもう一度試してください。");
          localStorage.removeItem(CODE_VERIFIER_KEY);
          return;
        }
        await new Promise<void>((resolve) => {
          const onMessage = async (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            window.removeEventListener("message", onMessage);
            messageListenerRef.current = null;
            clearInterval(pollTimer);
            const code = event.data.code as string | undefined;
            if (code) await exchangeCode(code);
            resolve();
          };
          messageListenerRef.current = onMessage;
          window.addEventListener("message", onMessage);
          const pollTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimer);
              window.removeEventListener("message", onMessage);
              messageListenerRef.current = null;
              localStorage.removeItem(CODE_VERIFIER_KEY);
              resolve();
            }
          }, 500);
        });
      } else {
        window.location.href = auth_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
      localStorage.removeItem(CODE_VERIFIER_KEY);
    } finally {
      setIsSigningIn(false);
    }
  }

  const activate = useCallback(async (target: StoredAccount): Promise<boolean> => {
    let access = target.access;
    let decoded = userFromToken(access);
    if (!decoded) {
      const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, refresh_token: target.refresh }),
      }).catch(() => null);
      if (!response?.ok) return false;
      access = ((await response.json()) as { access_token: string }).access_token;
      decoded = userFromToken(access);
      if (!decoded) return false;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, target.refresh);
    setAccounts(upsertAccount({ user: decoded, access, refresh: target.refresh }));
    setUser(decoded);
    return true;
  }, []);

  const clearActive = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CODE_VERIFIER_KEY);
    setUser(null);
  }, []);

  /** 保存済みアカウントへ切り替える。失効していれば一覧から外す。 */
  const switchAccount = useCallback(async (id: string): Promise<boolean> => {
    const target = readAccounts().find((item) => item.user.id === id);
    if (!target) return false;
    const ok = await activate(target);
    if (!ok) {
      const rest = readAccounts().filter((item) => item.user.id !== id);
      writeAccounts(rest);
      setAccounts(rest.map((item) => item.user));
    }
    return ok;
  }, [activate]);

  /** 指定アカウントをこの端末から外す。使用中なら残りのアカウントへ切り替える。 */
  const removeAccount = useCallback(async (id: string): Promise<void> => {
    const rest = readAccounts().filter((item) => item.user.id !== id);
    writeAccounts(rest);
    setAccounts(rest.map((item) => item.user));
    if (loginUser?.id !== id) return;
    clearActive();
    for (const candidate of rest) {
      if (await activate(candidate)) return;
    }
  }, [loginUser?.id, activate, clearActive]);

  const signOut = useCallback(() => {
    if (loginUser?.id) void removeAccount(loginUser.id);
    else clearActive();
  }, [loginUser?.id, removeAccount, clearActive]);

  const refreshToken = useCallback(async () => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) {
      signOut();
      return;
    }
    const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, refresh_token: stored }),
    });
    if (!response.ok) {
      signOut();
      return;
    }
    const { access_token } = (await response.json()) as { access_token: string };
    localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
    const decoded = userFromToken(access_token);
    if (decoded) setAccounts(upsertAccount({ user: decoded, access: access_token, refresh: stored }));
    setUser(decoded);
  }, [signOut]);

  const checkAuth = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (accessToken) {
        const decoded = userFromToken(accessToken);
        if (decoded) {
          const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (stored && !readAccounts().some((item) => item.user.id === decoded.id)) {
            setAccounts(upsertAccount({ user: decoded, access: accessToken, refresh: stored }));
          }
          setUser(decoded);
          return;
        }
      }
      if (localStorage.getItem(REFRESH_TOKEN_KEY)) await refreshToken();
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, owner: loginUser, subAccounts, switchPersona, reloadSubAccounts, accounts, switchAccount, removeAccount, isLoading, isSigningIn, error, signIn, signOut, clearError, exchangeCode }}>
      {children}
    </AuthContext.Provider>
  );
}
