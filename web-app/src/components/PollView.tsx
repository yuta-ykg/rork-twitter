import { votePoll, type Poll } from "@/lib/polls";
import { t } from "@/lib/language";
import { useAuth } from "@/hooks/authContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/lib/posts";

function remaining(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return t("終了");
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${t("残り")} ${minutes}${t("分")}`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${t("残り")} ${hours}${t("時間")}`;
  return `${t("残り")} ${Math.ceil(hours / 24)}${t("日")}`;
}

/** 投稿に付いた投票。投票後・終了後は結果をバーで表示する。 */
export function PollView({ postId, poll, readOnly = false }: { postId: string; poll: Poll; readOnly?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const closed = new Date(poll.endsAt).getTime() <= Date.now();
  const showResults = closed || poll.myVote !== null || readOnly;
  const total = poll.counts.reduce((sum, n) => sum + n, 0);
  const vote = useMutation({
    mutationFn: (index: number) => votePoll(postId, index, user?.id ?? ""),
    onSuccess: (next) => {
      queryClient.setQueryData<Post[]>(["timeline", user?.id], (current) =>
        current?.map((item) => item.id === postId ? { ...item, poll: next } : item));
    },
    onError: () => toast.error(t("投票できませんでした。")),
  });
  const maxCount = Math.max(...poll.counts);

  return (
    <div className="mt-2 space-y-1.5" onClick={(event) => event.stopPropagation()}>
      {poll.options.map((label, index) => {
        const count = poll.counts[index] ?? 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const mine = poll.myVote === index;
        if (!showResults) {
          return (
            <button
              key={label + index}
              type="button"
              disabled={vote.isPending || !user}
              onClick={() => vote.mutate(index)}
              className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#1D9BF0] px-4 text-[15px] font-bold text-[#1D9BF0] transition active:scale-[0.98] active:bg-[#1D9BF0]/10"
            >
              {label}
            </button>
          );
        }
        return (
          <div key={label + index} className="relative flex min-h-[40px] items-center overflow-hidden rounded-lg bg-muted px-3">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${count === maxCount && count > 0 ? "bg-[#1D9BF0]/35" : "bg-[#1D9BF0]/15"}`}
              style={{ width: `${percent}%` }}
            />
            <span className={`relative flex min-w-0 flex-1 items-center gap-1 text-[15px] ${mine ? "font-bold" : ""}`}>
              <span className="truncate">{label}</span>
              {mine ? <Check className="h-4 w-4 shrink-0" aria-label={t("あなたの投票")} /> : null}
            </span>
            <span className="relative pl-2 text-[15px] font-bold tabular-nums">{percent}%</span>
          </div>
        );
      })}
      <p className="text-[13px] text-muted-foreground">
        {total}{t("票")} · {remaining(poll.endsAt)}
      </p>
    </div>
  );
}
