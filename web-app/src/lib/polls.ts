import { isDevelopmentSession, readDevelopmentPosts, writeDevelopmentPosts } from "@/lib/development";
import { supabase } from "@/lib/supabase";

export type PollKind = "poll" | "quiz";
export type PollOptionResult = "correct" | "close" | "incorrect";

export type PollDraftOption = {
  text: string;
  result: PollOptionResult;
  feedback: string;
};

export type PollDraft = {
  kind: PollKind;
  allowsMultiple: boolean;
  explanation: string;
  options: PollDraftOption[];
};

export type PostPollOption = {
  id: string;
  text: string;
  position: number;
  result: PollOptionResult | null;
  feedback: string | null;
  voteCount: number | null;
  selected: boolean;
};

export type PostPoll = {
  kind: PollKind;
  allowsMultiple: boolean;
  explanation: string | null;
  responseCount: number;
  hasResponded: boolean;
  options: PostPollOption[];
};

type PollRow = {
  post_id: string;
  poll_kind: PollKind;
  allows_multiple: boolean;
  explanation: string | null;
  response_count: number;
  has_responded: boolean;
  options: Array<{
    id: string;
    text: string;
    position: number;
    result: PollOptionResult | null;
    feedback: string | null;
    vote_count: number | null;
    selected: boolean;
  }>;
};

export function newPollDraft(kind: PollKind): PollDraft {
  return {
    kind,
    allowsMultiple: false,
    explanation: "",
    options: [
      { text: "", result: "correct", feedback: "" },
      { text: "", result: "incorrect", feedback: "" },
    ],
  };
}

export function isPollDraftValid(draft: PollDraft | null): boolean {
  if (!draft) return true;
  if (draft.options.length < 2 || draft.options.length > 6 || draft.explanation.length > 280) return false;
  const labels = draft.options.map((option) => option.text.trim().toLocaleLowerCase());
  if (labels.some((label) => !label || Array.from(label).length > 60) || new Set(labels).size !== labels.length) return false;
  if (draft.options.some((option) => Array.from(option.feedback.trim()).length > 60)) return false;
  return draft.kind !== "quiz" || draft.options.some((option) => option.result === "correct");
}

export function pollFromDraft(draft: PollDraft): PostPoll {
  const correctCount = draft.options.filter((option) => option.result === "correct").length;
  return {
    kind: draft.kind,
    allowsMultiple: draft.allowsMultiple || (draft.kind === "quiz" && correctCount > 1),
    explanation: draft.kind === "quiz" ? draft.explanation.trim() || null : null,
    responseCount: 0,
    hasResponded: false,
    options: draft.options.map((option, position) => ({
      id: crypto.randomUUID(),
      text: option.text.trim(),
      position,
      result: draft.kind === "quiz" ? option.result : null,
      feedback: draft.kind === "quiz" ? option.feedback.trim() || null : null,
      voteCount: null,
      selected: false,
    })),
  };
}

function toPoll(row: PollRow): PostPoll {
  return {
    kind: row.poll_kind,
    allowsMultiple: row.allows_multiple,
    explanation: row.explanation,
    responseCount: Number(row.response_count ?? 0),
    hasResponded: row.has_responded,
    options: (row.options ?? []).map((option) => ({
      id: option.id,
      text: option.text,
      position: Number(option.position),
      result: option.result,
      feedback: option.feedback,
      voteCount: option.vote_count === null ? null : Number(option.vote_count),
      selected: Boolean(option.selected),
    })).sort((a, b) => a.position - b.position),
  };
}

export async function fetchPostPolls(postIds: string[], userId?: string | null): Promise<Map<string, PostPoll>> {
  if (postIds.length === 0) return new Map();
  if (isDevelopmentSession()) {
    return new Map(readDevelopmentPosts().flatMap((post) => post.poll ? [[post.id, post.poll] as const] : []));
  }
  const { data, error } = await supabase.rpc("get_post_polls", {
    requested_post_ids: postIds,
    expected_user_id: userId ?? null,
  });
  if (error) throw error;
  return new Map(((data ?? []) as PollRow[]).map((row) => [row.post_id, toPoll(row)]));
}

export async function submitPollResponse(postId: string, optionIds: string[], userId: string): Promise<PostPoll> {
  if (isDevelopmentSession()) {
    const posts = readDevelopmentPosts();
    const post = posts.find((item) => item.id === postId);
    if (!post?.poll || post.poll.hasResponded) throw new Error("回答を保存できませんでした。");
    const choices = new Set(optionIds);
    if (choices.size === 0 || (!post.poll.allowsMultiple && choices.size !== 1)
      || [...choices].some((id) => !post.poll?.options.some((option) => option.id === id))) {
      throw new Error("回答を選択してください。");
    }
    const poll: PostPoll = {
      ...post.poll,
      responseCount: post.poll.responseCount + 1,
      hasResponded: true,
      options: post.poll.options.map((option) => ({
        ...option,
        selected: choices.has(option.id),
        voteCount: (option.voteCount ?? 0) + (choices.has(option.id) ? 1 : 0),
      })),
    };
    writeDevelopmentPosts(posts.map((item) => item.id === postId ? { ...item, poll } : item));
    return poll;
  }
  const { data, error } = await supabase.rpc("submit_post_poll_response", {
    target_post_id: postId,
    option_ids: optionIds,
    expected_user_id: userId,
  });
  if (error || !data?.[0]) throw error ?? new Error("回答を保存できませんでした。");
  return toPoll(data[0] as PollRow);
}
