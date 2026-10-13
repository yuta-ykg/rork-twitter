import { createContext, useContext } from "react";
import type { AuthUser } from "@/hooks/authUser";
import type { SubAccount } from "@/lib/subAccounts";

export interface AuthContextType {
  /** 操作中のユーザー（サブアカウントに切り替え中はそのサブアカウント）。 */
  user: AuthUser | null;
  /** ログインしている本人（メインアカウント）。 */
  owner: AuthUser | null;
  subAccounts: SubAccount[];
  /** サブアカウントのIDに切り替える。null でメインに戻る。 */
  switchPersona: (sub: SubAccount | null) => void;
  reloadSubAccounts: () => Promise<void>;
  accounts: AuthUser[];
  switchAccount: (id: string) => Promise<boolean>;
  removeAccount: (id: string) => Promise<void>;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  exchangeCode: (code: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
