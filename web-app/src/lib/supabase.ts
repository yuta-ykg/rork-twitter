import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** サブアカウントとして操作中のユーザー（localStorage）。 */
export const ACTING_KEY = "rork:acting_as";

function actingId(): string | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTING_KEY) ?? "null") as { id?: string } | null;
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

/** 操作中のサブアカウントIDを全リクエストに付ける。サーバー側で持ち主を検証する。 */
const actingFetch: typeof fetch = (input, init) => {
  const id = actingId();
  if (!id) return fetch(input, init);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (!headers.has("x-acting-as")) headers.set("x-acting-as", id);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseAnonKey || "", {
  auth: { persistSession: false },
  global: { fetch: actingFetch },
  accessToken: async () => localStorage.getItem("rork:access_token") ?? undefined,
});
