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
};

const STORAGE_KEY = "iruka-posts";

function at(hour: number, minute: number, daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function seed(): Post[] {
  return [
    { id: crypto.randomUUID(), authorName: "海野ミナ", handle: "@mina", initial: "海", body: "朝の波が静かで、コーヒーがうまい。", createdAt: at(7, 42), isMine: false, avatarIndex: 0 },
    { id: crypto.randomUUID(), authorName: "青木レン", handle: "@ren", initial: "青", body: "今日の一言。深呼吸してから出る。", createdAt: at(8, 5), isMine: false, avatarIndex: 1 },
    { id: crypto.randomUUID(), authorName: "ナミ", handle: "@nami", initial: "ナ", body: "電車で見た空が、思ったより青かった。", createdAt: at(8, 31), isMine: false, avatarIndex: 2 },
    { id: crypto.randomUUID(), authorName: "カイ", handle: "@kai", initial: "カ", body: "昼休みに一杯。それだけで十分。", createdAt: at(12, 8), isMine: false, avatarIndex: 3 },
    { id: crypto.randomUUID(), authorName: "ソラ", handle: "@sora", initial: "ソ", body: "70字で足りることは、思ったより多い。", createdAt: at(13, 16), isMine: false, avatarIndex: 4 },
    { id: crypto.randomUUID(), authorName: "あなた", handle: "@you", initial: "あ", body: "今日は波の音を聞きながら書く。", createdAt: at(9, 12), isMine: true, avatarIndex: 0 },
    { id: crypto.randomUUID(), authorName: "あなた", handle: "@you", initial: "あ", body: "短くても、残る。", createdAt: at(21, 4, 1), isMine: true, avatarIndex: 1 },
    { id: crypto.randomUUID(), authorName: "あなた", handle: "@you", initial: "あ", body: "コーヒーのにおいが少し強い。", createdAt: at(8, 40, 2), isMine: true, avatarIndex: 2 },
    { id: crypto.randomUUID(), authorName: "あなた", handle: "@you", initial: "あ", body: "明日も一言だけ書こう。", createdAt: at(22, 18, 3), isMine: true, avatarIndex: 3 },
  ];
}

export function loadPosts(): Post[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Post[];
    return parsed.length > 0 ? parsed : seed();
  } catch {
    return seed();
  }
}

export function savePosts(posts: Post[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
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
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ja-JP", { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `今朝 ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `昨日 ${time}`;
  return date.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}
