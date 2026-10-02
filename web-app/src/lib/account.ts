import { endDevelopmentSession, isDevelopmentSession } from "@/lib/development";
import { supabase } from "@/lib/supabase";

const ACCESS_TOKEN_KEY = "rork:access_token";
const REFRESH_TOKEN_KEY = "rork:refresh_token";
const CODE_VERIFIER_KEY = "rork:pkce_verifier";

/** Removes the signed-in account's posts, profile, and related rows, then clears the local session. */
export async function deleteAccount(userId: string): Promise<void> {
  if (isDevelopmentSession()) {
    localStorage.removeItem("iruka:development-posts");
    localStorage.removeItem("iruka:development-profile");
    localStorage.removeItem(`iruka:relationships:${encodeURIComponent(userId)}`);
    localStorage.removeItem(`iruka:bookmarks:development:${encodeURIComponent(userId)}`);
    endDevelopmentSession();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CODE_VERIFIER_KEY);
    return;
  }

  const { error } = await supabase.rpc("delete_account", { expected_user_id: userId });
  if (error) throw error;
  localStorage.removeItem(`iruka:bookmarks:account:${encodeURIComponent(userId)}`);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(CODE_VERIFIER_KEY);
}
