import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/lib/supabase";

export async function fetchAccountPlan(userId: string) {
  const { data, error } = await supabase.rpc("get_account_plan", { expected_user_id: userId });
  if (error) throw error;
  if (!data?.[0]) throw new Error("Missing account plan");
  return data[0];
}
export function usePostLimit(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["account-plan", user?.id],
    queryFn: () => fetchAccountPlan(user!.id),
    enabled: enabled && !!user?.id,
    staleTime: 0,
    refetchInterval: enabled ? 30000 : false,
  });
  return { ...query, limit: query.data?.character_limit ?? 280, ready: query.isSuccess && !query.isError };
}
