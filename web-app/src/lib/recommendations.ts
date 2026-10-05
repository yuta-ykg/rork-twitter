import type { Post } from "@/lib/posts";

export type TimelineMode = "recommended" | "latest";

const topicStopWords = new Set([
  "今日", "明日", "昨日", "投稿", "返信", "です", "ます", "した", "する", "いる", "ある",
  "こと", "もの", "これ", "それ", "この", "その", "ため", "よう", "ので", "から", "まで",
  "さん", "ます", "the", "and", "for", "with", "from", "about", "this", "that", "have",
  "just", "your", "you", "are", "was", "but", "not", "all", "can", "our", "what", "when",
  "then", "they", "will", "into", "오늘", "그리고", "이것", "저는", "我们", "你们", "一个",
  "今天", "明天", "帖子", "可以", "这个", "因为",
]);

const topicRuns = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;
const latinWords = /[a-z][a-z0-9_-]{1,}/g;
const hashtags = /#[\p{Letter}\p{Number}_-]+/gu;

function topicTokens(body: string): Set<string> {
  const normalized = body.normalize("NFKC").toLowerCase();
  const tokens = new Set<string>();
  for (const run of normalized.match(topicRuns) ?? []) {
    const characters = Array.from(run);
    for (let index = 0; index < characters.length - 1; index += 1) {
      const token = characters[index] + characters[index + 1];
      if (!topicStopWords.has(token)) tokens.add(token);
    }
  }
  for (const word of normalized.match(latinWords) ?? []) {
    if (!topicStopWords.has(word)) tokens.add(word);
  }
  for (const hashtag of normalized.match(hashtags) ?? []) tokens.add(hashtag);
  return tokens;
}

function ageInDays(createdAt: string, now: number): number {
  const created = Date.parse(createdAt);
  return Number.isFinite(created) ? Math.max(0, (now - created) / 86_400_000) : 365;
}

/**
 * Rank the existing visible-post pool using only the current user's interactions.
 * Likes/bookmarks are strong topic signals; authored posts are a softer signal.
 */
export function rankTimeline(
  posts: Post[],
  bookmarkedIds: string[],
  mode: TimelineMode = "recommended",
  now = Date.now(),
): Post[] {
  const newestFirst = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (mode === "latest" || newestFirst.length < 2) return newestFirst;

  const bookmarks = new Set(bookmarkedIds);
  const tokensById = new Map(newestFirst.map((post) => [post.id, topicTokens(post.body)]));
  const documentFrequency = new Map<string, number>();
  for (const tokens of tokensById.values()) {
    for (const token of tokens) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }

  const interests = new Map<string, number>();
  const authors = new Map<string, number>();
  for (const post of newestFirst) {
    const signal = (post.isLiked ? 2 : 0) + (bookmarks.has(post.id) ? 3.2 : 0) + (post.isMine ? 0.7 : 0);
    if (signal === 0) continue;
    const ageDecay = Math.pow(0.5, ageInDays(post.createdAt, now) / 60);
    for (const token of tokensById.get(post.id) ?? []) {
      const frequency = documentFrequency.get(token) ?? 1;
      const rarity = 1 + Math.log((newestFirst.length + 1) / (frequency + 1));
      interests.set(token, (interests.get(token) ?? 0) + signal * ageDecay * rarity);
    }
    if (!post.isMine && post.userId) {
      authors.set(post.userId, (authors.get(post.userId) ?? 0) + signal * ageDecay);
    }
  }
  if (interests.size === 0 && authors.size === 0) return newestFirst;

  const strongestInterest = [...interests.values()].reduce((strongest, value) => Math.max(strongest, value), 0);
  const strongestAuthor = [...authors.values()].reduce((strongest, value) => Math.max(strongest, value), 0);
  const scores = new Map<string, number>();
  for (const post of newestFirst) {
    const tokens = tokensById.get(post.id) ?? new Set<string>();
    const matchedInterest = strongestInterest > 0
      ? [...tokens].reduce((sum, token) => sum + (interests.get(token) ?? 0) / strongestInterest, 0)
      : 0;
    let topicMatch = Math.min(1, matchedInterest / Math.sqrt(Math.max(1, tokens.size)));
    if (post.isLiked || bookmarks.has(post.id) || post.isMine) topicMatch *= 0.25;

    const authorMatch = !post.isMine && strongestAuthor > 0
      ? Math.min(1, (authors.get(post.userId ?? "") ?? 0) / strongestAuthor)
      : 0;
    const freshness = Math.pow(0.5, ageInDays(post.createdAt, now) / 7);
    const popularity = Math.min(1, Math.log1p(Math.max(0, post.likeCount ?? 0)) / Math.log(51));
    scores.set(post.id, freshness * 0.62 + topicMatch * 0.3 + authorMatch * 0.05 + popularity * 0.03);
  }

  return newestFirst.sort((a, b) => {
    const scoreDifference = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
    return scoreDifference !== 0 ? scoreDifference : b.createdAt.localeCompare(a.createdAt);
  });
}
