import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/profiles";
import { isGuestSession } from "@/lib/development";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";

/** 保存済みプロフィールの表示名・ハンドル・頭文字。プロフィール編集がすぐ反映される。 */
export function useOwnProfile() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["ownProfile", user?.id],
    queryFn: async () => (user?.id ? await fetchProfile(user.id) : null),
    enabled: Boolean(user?.id) && !isGuestSession(),
  });
  if (!user) return null;
  const name = query.data?.name || displayName(user);
  return {
    name,
    handle: query.data?.handle ? `@${query.data.handle}` : userHandle(user),
    initial: Array.from(name)[0] ?? "い",
    avatar: query.data?.avatar_url || user.picture || null,
  };
}

