import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isDevelopmentSession } from "@/lib/development";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string; post_id: string; post_body: string;
  created_at: string; read_at: string | null; like_count: number; unread_count: number;
};
type Cursor = { created_at: string; id: string } | null;
export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const remote = Boolean(userId && !isDevelopmentSession());
  const client = useQueryClient();
  const queryKey = ["notifications", userId] as const;
  const query = useInfiniteQuery({
    queryKey,
    enabled: remote,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam, signal }) => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_notifications", {
        expected_user_id: userId,
        ...(pageParam ? { before_created_at: pageParam.created_at, before_id: pageParam.id } : {}),
      }).abortSignal(signal);
      if (error) throw error;
      return data as AppNotification[];
    },
    getNextPageParam: (page) => page.length === 50 ? { created_at: page[49].created_at, id: page[49].id } : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
    retry: 1,
  });
  const mutation = useMutation({
    mutationFn: async (input: { id: string; before: string } | { before: string }) => {
      if (!userId || !remote) throw new Error("Login required");
      const result = "id" in input
        ? await supabase.rpc("mark_post_notifications_read", { target_post_id: input.id, before_time: input.before, expected_user_id: userId })
        : await supabase.rpc("mark_all_notifications_read", { before_time: input.before, expected_user_id: userId });
      if (result.error) throw result.error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  const rows = remote ? query.data?.pages.flat() ?? [] : [];
  return {
    rows, unreadCount: remote ? Number(query.data?.pages[0]?.[0]?.unread_count ?? 0) : 0,
    loading: remote && query.isPending, error: remote && query.isError,
    refresh: query.refetch, hasMore: remote && Boolean(query.hasNextPage),
    loadingMore: query.isFetchingNextPage, loadMore: query.fetchNextPage,
    marking: mutation.isPending, markRead: (id: string, before: string) => mutation.mutateAsync({ id, before }),
    markAllRead: () => rows[0] ? mutation.mutateAsync({ before: rows[0].created_at }) : Promise.resolve(),
  };
}

