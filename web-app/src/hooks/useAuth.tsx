import {
  canSkipLogin, clearLocalData, developerUser, endDevelopmentSession, expireGuestSessionIfNeeded,
  isDevelopmentSession, isGuestSession, localUser, readDevelopmentPosts, startDevelopmentSession, startGuestSession,
} from "@/lib/development";
import { insertPost } from "@/lib/posts";
import { t } from "@/lib/language";
import { toast } from "sonner";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export function displayName(user: AuthUser): string {
  const name = user.name?.trim();
  return name && name.length > 0 ? name : user.email;
}

export function userHandle(user: AuthUser): string {
  const local = user.email.split("@")[0] ?? "you";
  const cleaned = local.replace(/[^A-Za-z0-9_]/g, "");
  return `@${(cleaned || "you").slice(0, 38)}`;
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

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => void;
  clearError: () => void;
  canSkipLogin: boolean;
  skipLogin: () => void;
  exchangeCode: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener("message", messageListenerRef.current);
        messageListenerRef.current = null;
      }
    };
  }, []);

  async function checkAuth() {
    try {
      if (expireGuestSessionIfNeeded()) {
        toast(t("ゲストのデータは保持期限（30日）を過ぎたため、削除されました。"));
      }
      if (isDevelopmentSession()) { setUser(localUser()); return; }
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (accessToken) {
        const decoded = userFromToken(accessToken);
        if (decoded) {
          setUser(decoded);
          return;
        }
      }
      if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
        await refreshToken();
      }
    } finally {
      setIsLoading(false);
    }
  }

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
    setUser(userData);
    await carryOverGuestData(userData);
  }

  function signInAsGuest() {
    setError(null);
    setIsLoading(false);
    setUser(startGuestSession());
  }

  /** Moves device-local guest posts into the newly signed-in account, then deletes the guest data. */
  async function carryOverGuestData(author: AuthUser) {
    if (!isGuestSession()) return;
    const guestPosts = readDevelopmentPosts().filter((post) => {
      if (post.parentId) return false;
      const body = post.body.trim();
      return body.length > 0 && Array.from(body).length <= 70;
    });
    endDevelopmentSession();
    clearLocalData();
    let moved = 0;
    for (const post of guestPosts) {
      try {
        await insertPost(post.body.trim(), author);
        moved += 1;
      } catch { /* Skip posts that fail to move. */ }
    }
    if (moved > 0) toast.success(t("ゲストの投稿を新しいアカウントに引き継ぎました"));
  }

  function skipLogin() {
    if (!canSkipLogin) return;
    startDevelopmentSession();
    setUser(developerUser);
    setError(null);
    setIsLoading(false);
  }

  async function signIn(provider: "google" | "apple") {
    // Keep guest sessions alive so their posts can be carried over after sign-in.
    if (!isGuestSession()) endDevelopmentSession();
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

  async function refreshToken() {
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
    setUser(userFromToken(access_token));
  }

  function signOut() {
    if (isGuestSession()) clearLocalData();
    endDevelopmentSession();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CODE_VERIFIER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isSigningIn, error, signIn, signInAsGuest, signOut, clearError, exchangeCode, canSkipLogin, skipLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
