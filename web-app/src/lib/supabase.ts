import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseAnonKey || "", {
  auth: { persistSession: false },
  accessToken: async () => localStorage.getItem("rork:access_token") ?? undefined,
});
