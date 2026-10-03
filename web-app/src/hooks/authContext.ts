import { createContext, useContext } from "react";
import type { AuthUser } from "@/hooks/authUser";

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
