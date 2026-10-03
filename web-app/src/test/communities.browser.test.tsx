import { render } from "vitest-browser-react";
import App from "@/App";
import type { CommunitySnapshot } from "@/lib/communities";

const fixtures = vi.hoisted(() => ({ user: { id: "alice", email: "alice@example.test" } as { id: string; email: string } | null,
  local: false, snapshot: null as CommunitySnapshot | null,
  find: vi.fn(), read: vi.fn(), manage: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: fixtures.user, isLoading: false }), displayName: () => "Alice", userHandle: () => "@alice" }));
vi.mock("@/lib/development", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/development")>(),
  isDevelopmentSession: () => fixtures.local, isGuestSession: () => fixtures.local }));
vi.mock("@/lib/communities", () => ({ findCommunities: fixtures.find, getCommunity: fixtures.read, manageCommunity: fixtures.manage }));

beforeEach(() => {
  localStorage.clear(); fixtures.user = { id: "alice", email: "alice@example.test" }; fixtures.local = false; fixtures.snapshot = null;
  fixtures.find.mockReset(); fixtures.read.mockReset(); fixtures.manage.mockReset();
  fixtures.find.mockImplementation(async () => fixtures.snapshot ? [fixtures.snapshot.community] : []);
  fixtures.read.mockImplementation(async () => structuredClone(fixtures.snapshot));
  fixtures.manage.mockImplementation(async (author, operation, id, input) => {
    if (operation === "create") fixtures.snapshot = { community: { id, owner_id: author.id, name: input.name, description: input.description, member_count: 1, is_member: true },
      membership: "joined", role: "owner", members: [{ id: author.id, name: "Alice", handle: "alice", status: "joined", is_owner: true, role: "owner" }], pinned_post: null, posts: [], has_more: false };
    const snapshot = fixtures.snapshot!;
    if (operation === "update") { snapshot.community.name = input.name; snapshot.community.description = input.description; }
    if (operation === "join") { snapshot.membership = "joined"; snapshot.role = "member"; snapshot.community.is_member = true; snapshot.community.member_count++; }
    if (operation === "leave") { snapshot.membership = null; snapshot.role = null; snapshot.community.is_member = false; snapshot.community.member_count--; }
    if (operation === "promote" || operation === "demote") {
      const member = snapshot.members.find((item) => item.id === input.memberId);
      if (member) member.role = operation === "promote" ? "moderator" : "member";
    }
    if (operation === "remove" || operation === "restore") {
      const member = snapshot.members.find((item) => item.id === input.memberId);
      if (member) { member.status = operation === "remove" ? "removed" : "joined"; if (operation === "remove") member.role = "member"; }
    }
    if (operation === "post") snapshot.posts.unshift({ id: input.postId, user_id: author.id, body: input.body, created_at: "2026-10-03T00:00:00Z", author_name: "Alice", handle: "alice" });
    if (operation === "pin_post") {
      const post = snapshot.posts.find((item) => item.id === input.postId);
      if (post) { if (snapshot.pinned_post) snapshot.posts.unshift(snapshot.pinned_post); snapshot.pinned_post = post; snapshot.posts = snapshot.posts.filter((item) => item.id !== post.id); }
    }
    if (operation === "unpin_post" && snapshot.pinned_post?.id === input.postId) { snapshot.posts.unshift(snapshot.pinned_post); snapshot.pinned_post = null; }
    if (operation === "delete_post") { snapshot.posts = snapshot.posts.filter((post) => post.id !== input.postId); if (snapshot.pinned_post?.id === input.postId) snapshot.pinned_post = null; }
    if (operation === "delete") fixtures.snapshot = null;
    return structuredClone(fixtures.snapshot);
  });
});

test("an owner can create, post, edit and delete a community", async () => {
  history.replaceState(null,"","/communities");
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "コミュニティを作成", exact: true }).click();
  await screen.getByRole("textbox", { name: "コミュニティ名（1〜40文字）" }).fill("読書部");
  await screen.getByRole("textbox", { name: "説明（160文字まで）" }).fill("本の感想を共有");
  await screen.getByRole("button", { name: "保存", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "読書部", exact: true })).toBeVisible();
  await screen.getByRole("textbox", { name: "コミュニティに投稿" }).fill("あ".repeat(71));
  await expect.element(screen.getByRole("button", { name: "投稿する", exact: true })).toBeDisabled();
  await screen.getByRole("textbox", { name: "コミュニティに投稿" }).fill("この本がおすすめです");
  await screen.getByRole("button", { name: "投稿する", exact: true }).click();
  await expect.element(screen.getByText("この本がおすすめです", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("textbox", { name: "コミュニティに投稿" })).toHaveValue("");
  await screen.getByRole("button", { name: "コミュニティを編集", exact: true }).click();
  await screen.getByRole("textbox", { name: "コミュニティ名（1〜40文字）" }).fill("読書クラブ");
  await screen.getByRole("button", { name: "保存", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "読書クラブ", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "投稿を削除: この本がおすすめです", exact: true }).click();
  await screen.getByRole("button", { name: "実行する", exact: true }).click();
  await expect.element(screen.getByText("この本がおすすめです", { exact: true })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "コミュニティを削除", exact: true }).click();
  await screen.getByRole("button", { name: "実行する", exact: true }).click();
  await expect.element(screen.getByText("コミュニティがありません。", { exact: true })).toBeVisible();
  await screen.unmount();
});
test("a member joins before posting and loses the composer after leaving", async () => {
  fixtures.user = { id: "bob", email: "bob@example.test" };
  const id = "00000000-0000-4000-8000-000000000001";
  fixtures.snapshot = { community: { id, owner_id: "alice", name: "読書部", description: "本の感想", member_count: 1, is_member: false }, membership: null, role: null, members: [], pinned_post: null, posts: [], has_more: false };
  history.replaceState(null,"",`/communities/${id}`);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "参加する", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("textbox", { name: "コミュニティに投稿" })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "参加する", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "コミュニティに投稿" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "コミュニティを編集", exact: true })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "退出する", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "コミュニティに投稿" })).not.toBeInTheDocument();
  await screen.unmount();
});
test("anonymous visitors read posts without membership or moderation controls", async () => {
  fixtures.user = null;
  const id = "00000000-0000-4000-8000-000000000001";
  fixtures.snapshot = { community: { id, owner_id: "alice", name: "読書部", description: "本の感想", member_count: 1, is_member: false }, membership: null, role: null, members: [],
    pinned_post: { id: "post", user_id: "alice", author_name: "Alice", handle: "alice", body: "おすすめの本", created_at: "2026-10-03T00:00:00Z" }, posts: [], has_more: false };
  history.replaceState(null,"",`/communities/${id}`);
  const screen = await render(<App />);
  await expect.element(screen.getByText("おすすめの本", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("固定された投稿", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "固定を解除: おすすめの本", exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "参加する", exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "コミュニティを削除", exact: true })).not.toBeInTheDocument();
  expect(fixtures.manage).not.toHaveBeenCalled();
  await screen.unmount();
});
test("a failed post keeps the draft and reuses its ID on retry", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  fixtures.snapshot = { community: { id, owner_id: "alice", name: "読書部", description: "本の感想", member_count: 1, is_member: true }, membership: "joined", role: "owner", members: [], pinned_post: null, posts: [], has_more: false };
  fixtures.manage.mockRejectedValueOnce(new Error("投稿できませんでした。"));
  history.replaceState(null,"",`/communities/${id}`);
  const screen = await render(<App />);
  await screen.getByRole("textbox", { name: "コミュニティに投稿" }).fill("再送する本文");
  await screen.getByRole("button", { name: "投稿する", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  await expect.element(screen.getByRole("textbox", { name: "コミュニティに投稿" })).toHaveValue("再送する本文");
  const firstId = fixtures.manage.mock.calls[0][3].postId;
  await screen.getByRole("button", { name: "投稿する", exact: true }).click();
  await expect.element(screen.getByText("再送する本文", { exact: true })).toBeVisible();
  expect(fixtures.manage.mock.calls[1][3].postId).toBe(firstId);
  await screen.unmount();
});
test("an owner appoints moderators and a moderator can manage members and posts", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  fixtures.snapshot = { community: { id, owner_id: "alice", name: "読書部", description: "本の感想", member_count: 3, is_member: true }, membership: "joined", role: "owner",
    members: [
      { id: "alice", name: "Alice", handle: "alice", status: "joined", is_owner: true, role: "owner" },
      { id: "bob", name: "Bob", handle: "bob", status: "joined", is_owner: false, role: "member" },
      { id: "carol", name: "Carol", handle: "carol", status: "joined", is_owner: false, role: "member" },
    ], pinned_post: null, posts: [{ id: "post", user_id: "carol", author_name: "Carol", handle: "carol", body: "管理対象", created_at: "2026-10-03T00:00:00Z" }], has_more: false };
  history.replaceState(null,"",`/communities/${id}`);
  let screen = await render(<App />);
  await screen.getByLabelText("メンバー一覧", { exact: true }).click();
  await screen.getByRole("button", { name: "モデレーターにする: Bob", exact: true }).click();
  await expect.element(screen.getByText("モデレーター", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "モデレーターを解除: Bob", exact: true }).click();
  await expect.element(screen.getByText("モデレーター", { exact: true })).not.toBeInTheDocument();
  await screen.unmount();

  fixtures.user = { id: "bob", email: "bob@example.test" };
  fixtures.snapshot!.role = "moderator";
  fixtures.snapshot!.members[1].role = "moderator";
  screen = await render(<App />);
  await screen.getByLabelText("メンバー一覧", { exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "コミュニティを編集", exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "モデレーターにする", exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "メンバーを除外", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "投稿を固定: 管理対象", exact: true }).click();
  await expect.element(screen.getByText("固定された投稿", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "固定を解除: 管理対象", exact: true }).click();
  await expect.element(screen.getByText("固定された投稿", { exact: true })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "投稿を固定: 管理対象", exact: true }).click();
  await screen.getByRole("button", { name: "投稿を削除: 管理対象", exact: true }).click();
  await screen.getByRole("button", { name: "実行する", exact: true }).click();
  await expect.element(screen.getByText("管理対象", { exact: true })).not.toBeInTheDocument();
  await screen.unmount();
});
