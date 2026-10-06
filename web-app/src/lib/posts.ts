import { formatDateTime } from "@/lib/dateDisplay";
import { isDevelopmentSession, localUser, readDevelopmentPosts, writeDevelopmentPosts, readDevelopmentProfile } from "@/lib/development";
import { ensureProfile, fetchProfiles, type Profile } from "@/lib/profiles";
import { hiddenDevelopmentUsers } from "@/lib/userRelationships";
import { supabase } from "@/lib/supabase";
import { fetchPostPolls, isPollDraftValid, pollFromDraft, type PollDraft, type PostPoll } from "@/lib/polls";
import { fetchPostDiagnoses, isDiagnosisDraftValid, type DiagnosisDraft, type PostDiagnosis } from "@/lib/diagnoses";

export const MAX_CHARACTERS = 70;

export const avatarFills = ["#8ECAE6", "#CDB4DB", "#F4A6A6", "#95D5B2", "#E9C46A"] as const;

export type Post = {
  id: string;
  authorName: string;
  handle: string;
  initial: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  avatarIndex: number;
  userId?: string | null;
  parentId?: string | null;
  isLiked?: boolean;
  likeCount?: number;
  poll?: PostPoll | null;
  diagnosis?: PostDiagnosis | null;
};

type Row = {
  id: string;
  author_name: string;
  handle: string;
  initial: string;
  body: string;
  created_at: string;
  avatar_index: number;
  user_id: string | null;
  parent_id: string | null;
};

export type Author = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

function toPost(row: Row, userId?: string | null): Post {
  return {
    id: row.id,
    authorName: row.author_name,
    handle: row.handle,
    initial: row.initial,
    body: row.body,
    createdAt: row.created_at,
    isMine: Boolean(userId) && row.user_id === userId,
    avatarIndex: row.avatar_index,
    userId: row.user_id,
    parentId: row.parent_id,
    isLiked: false,
    likeCount: 0,
  };
}

const postColumns = "id, author_name, handle, initial, body, created_at, avatar_index, user_id, parent_id";

async function withFallback<T>(task: PromiseLike<T>, fallback: T): Promise<T> {
  try { return await task; } catch { return fallback; }
}

export async function fetchPosts(userId?: string | null): Promise<Post[]> {
  if (isDevelopmentSession()) {
    const profile = readDevelopmentProfile();
    return sortTimeline(readDevelopmentPosts()).filter((post) => !hiddenDevelopmentUsers(userId).has(post.userId ?? "")).map((post) => ({
      ...post, authorName: profile.name, handle: `@${profile.handle}`, initial: Array.from(profile.name)[0] ?? "開",
    }));
  }
  const { data, error } = await supabase.rpc("get_visible_posts", { expected_user_id: userId ?? null });
  if (error) throw error;
  const posts = (data ?? []).map((row) => toPost(row, userId));
  if (posts.length === 0) return posts;
  // 投いいね・投票・診断・プロフィールは任意の装飾データ。対応RPCのマイグレーションが
  // 未適用でもタイムライン自体は表示できるよう、失敗時は既定値にフォールバックする。
  const [likesData, profiles, polls, diagnoses] = await Promise.all([
    withFallback(supabase.rpc("get_post_likes", { post_ids: posts.map((post) => post.id) }).then((result) => result.data), null),
    withFallback(fetchProfiles(posts.flatMap((post) => post.userId ? [post.userId] : [])), [] as Profile[]),
    withFallback(fetchPostPolls(posts.map((post) => post.id), userId), new Map<string, PostPoll>()),
    withFallback(fetchPostDiagnoses(posts.map((post) => post.id), userId), new Map<string, PostDiagnosis>()),
  ]);
  const stats = likesData;
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const byId = new Map((stats ?? []).map((stat) => [stat.post_id, stat]));
  return posts.map((post) => {
    const stat = byId.get(post.id);
    const profile = post.userId ? profileById.get(post.userId) : undefined;
    return { ...post,
      authorName: profile?.name ?? post.authorName,
      handle: profile?.handle ? `@${profile.handle}` : post.handle,
      initial: (profile?.name ?? post.authorName).slice(0, 1),
      likeCount: Number(stat?.like_count ?? 0), isLiked: Boolean(userId && stat?.is_liked),
      poll: polls.get(post.id) ?? null,
      diagnosis: diagnoses.get(post.id) ?? null };
  });
}

export async function syncProfile(author: Author): Promise<void> {
  await ensureProfile(author);
}

export async function insertPost(body: string, author: Author, pollDraft: PollDraft | null = null, diagnosisDraft: DiagnosisDraft | null = null): Promise<Post> {
  if (!isPollDraftValid(pollDraft)) throw new Error("投票の入力内容を確認してください。");
  if (!isDiagnosisDraftValid(diagnosisDraft) || (pollDraft && diagnosisDraft)) throw new Error("診断の入力内容を確認してください。");
  if (isDevelopmentSession()) {
    const trimmed = body.trim();
    if (!trimmed || Array.from(trimmed).length > MAX_CHARACTERS) throw new Error("投稿は1〜70文字で入力してください。");
    const profile = readDevelopmentProfile();
    const post: Post = { id: crypto.randomUUID(), userId: localUser().id, authorName: profile.name,
      handle: `@${profile.handle}`, initial: Array.from(profile.name)[0] ?? "開", body: trimmed,
      createdAt: new Date().toISOString(), isMine: true, avatarIndex: 0, isLiked: false, likeCount: 0,
      poll: pollDraft ? pollFromDraft(pollDraft) : null,
      diagnosis: diagnosisDraft ? {
        ...diagnosisDraft, id: crypto.randomUUID(), creatorId: localUser().id, resultIndex: null, result: null,
      } : null };
    writeDevelopmentPosts([post, ...readDevelopmentPosts()]);
    return post;
  }
  const trimmed = body.trim();
  await syncProfile(author);
  const postId = crypto.randomUUID();
  const diagnosisId = diagnosisDraft ? crypto.randomUUID() : null;
  const request = diagnosisDraft ? supabase.rpc("create_post_with_diagnosis", {
    post_id: postId,
    post_body: trimmed,
    diagnosis_id: diagnosisId!,
    diagnosis_title: diagnosisDraft.title.trim(),
    diagnosis_description: diagnosisDraft.description.trim(),
    diagnosis_outcomes: diagnosisDraft.outcomes.map((outcome) => ({ title: outcome.title.trim(), description: outcome.description.trim() })),
    diagnosis_questions: diagnosisDraft.questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => ({ text: option.text.trim(), result_index: option.resultIndex })),
    })),
    expected_user_id: author.id,
  }) : pollDraft ? supabase.rpc("create_post_with_poll", {
    post_id: postId,
    post_body: trimmed,
    poll_kind: pollDraft.kind,
    poll_allows_multiple: pollDraft.allowsMultiple,
    poll_explanation: pollDraft.explanation.trim(),
    poll_options: pollDraft.options.map((option) => ({
      text: option.text.trim(),
      result: option.result,
      feedback: option.feedback.trim(),
    })),
    expected_user_id: author.id,
  }) : supabase.rpc("create_post", { post_id: postId, post_body: trimmed, expected_user_id: author.id });
  const { data, error } = await request;
  if (error || !data?.[0]) throw error ?? new Error("投稿できませんでした");
  const post = toPost(data[0], author.id);
  if (pollDraft) post.poll = (await fetchPostPolls([post.id], author.id)).get(post.id) ?? null;
  if (diagnosisDraft) post.diagnosis = (await fetchPostDiagnoses([post.id], author.id)).get(post.id) ?? null;
  return post;
}

export async function shareDiagnosisResultPost(diagnosis: PostDiagnosis, resultIndex: number, author: Author): Promise<Post> {
  const outcome = diagnosis.outcomes[resultIndex];
  if (!outcome) throw new Error("診断結果が見つかりません。");
  const body = Array.from(`診断結果：${outcome.title}（${diagnosis.title}）`).slice(0, MAX_CHARACTERS).join("");
  const diagnosisWithResult = { ...diagnosis, resultIndex, result: outcome };
  if (isDevelopmentSession()) {
    const profile = readDevelopmentProfile();
    const post: Post = {
      id: crypto.randomUUID(), userId: localUser().id, authorName: profile.name,
      handle: `@${profile.handle}`, initial: Array.from(profile.name)[0] ?? "開", body,
      createdAt: new Date().toISOString(), isMine: true, avatarIndex: 0, isLiked: false, likeCount: 0,
      diagnosis: diagnosisWithResult,
    };
    writeDevelopmentPosts([post, ...readDevelopmentPosts()]);
    return post;
  }
  await syncProfile(author);
  const postId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("create_diagnosis_result_post", {
    post_id: postId,
    post_body: body,
    diagnosis_id: diagnosis.id,
    result_index: resultIndex,
    expected_user_id: author.id,
  });
  if (error || !data?.[0]) throw error ?? new Error("診断結果を投稿できませんでした。");
  const post = toPost(data[0], author.id);
  post.diagnosis = diagnosisWithResult;
  return post;
}

export function sortTimeline(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function thisWeekCount(posts: Post[]): number {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return posts.filter((post) => post.isMine && new Date(post.createdAt) >= start).length;
}

export function timeLabel(iso: string): string {
  return formatDateTime(iso);
}

export async function setPostLike(id: string, liked: boolean, userId: string) {
  if (isDevelopmentSession()) {
    if (userId !== localUser().id) throw new Error("ローカルユーザーが一致しません。");
    const posts = readDevelopmentPosts();
    const post = posts.find((item) => item.id === id);
    if (!post) throw new Error("投稿が見つかりません。");
    const state = { isLiked: liked, likeCount: liked ? 1 : 0 };
    writeDevelopmentPosts(posts.map((item) => item.id === id ? { ...item, ...state } : item));
    return state;
  }
  if (!userId) throw new Error("いいねするにはログインしてください。");
  const { data, error } = await supabase.rpc("set_post_like", {
    target_post_id: id, liked, expected_user_id: userId,
  });
  if (error) throw error;
  const stat = data?.[0];
  if (!stat) throw new Error("いいねを保存できませんでした。");
  return { isLiked: stat.is_liked, likeCount: Number(stat.like_count) };
}

export async function insertReply(body: string, parentId: string, author: Author, replyId: string): Promise<Post> {
  const trimmed = body.trim();
  if (!trimmed || Array.from(trimmed).length > MAX_CHARACTERS) throw new Error("返信は1〜70文字で入力してください。");
  if (isDevelopmentSession()) {
    const posts = readDevelopmentPosts();
    if (!posts.some((post) => post.id === parentId)) throw new Error("投稿が見つかりません。");
    const existing = posts.find((post) => post.id === replyId);
    if (existing) {
      if (existing.parentId !== parentId || existing.body !== trimmed) throw new Error("返信を保存できませんでした。");
      return existing;
    }
    const profile = readDevelopmentProfile();
    const post: Post = { id: replyId, parentId, userId: author.id, authorName: profile.name,
      handle: `@${profile.handle}`, initial: Array.from(profile.name)[0] ?? "開", body: trimmed,
      createdAt: new Date().toISOString(), isMine: true, avatarIndex: 0, isLiked: false, likeCount: 0 };
    writeDevelopmentPosts([post, ...posts]); return post;
  }
  await syncProfile(author);
  const { data, error } = await supabase.rpc("create_reply", {
    reply_id: replyId, target_post_id: parentId, reply_body: trimmed, expected_user_id: author.id,
  });
  if (error || !data?.[0]) throw error ?? new Error("返信を保存できませんでした。");
  return toPost(data[0], author.id);
}
