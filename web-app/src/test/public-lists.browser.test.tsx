import { render } from "vitest-browser-react";
import App from "@/App";
import type { UserList } from "@/lib/lists";

const fixtures = vi.hoisted(() => ({ user: null as { id: string } | null,
  list: { id: "00000000-0000-4000-8000-000000000001", name: "友達", description: "公開テスト",
    owner_id: "alice", is_public: false, members: [{ id: "bob", name: "Bob", handle: "bob" }] } as UserList,
  fetchPublicList: vi.fn(), manageLists: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: fixtures.user, isLoading: false }),
  displayName: () => "Alice", userHandle: () => "@alice" }));
vi.mock("@/lib/development", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/development")>(), isDevelopmentSession: () => false, isGuestSession: () => false }));
vi.mock("@/lib/lists", () => ({ fetchPublicList: fixtures.fetchPublicList,
  manageLists: fixtures.manageLists, findPublicLists: async () => [], searchListProfiles: async () => [],
  publicListUrl: (id: string) => `${location.origin}/public/lists/${id}` }));
vi.mock("@/lib/posts", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/posts")>(), fetchPosts: async () => [], timeLabel: () => "Today" }));

beforeEach(() => {
  localStorage.clear(); fixtures.user = null; fixtures.list.is_public = false;
  fixtures.fetchPublicList.mockReset(); fixtures.manageLists.mockReset();
  fixtures.fetchPublicList.mockImplementation(async () => fixtures.list.is_public ? { list: fixtures.list,
    posts: [{ id: "post", authorName: "Bob", handle: "@bob", body: "公開された投稿", createdAt: "2026-10-03T00:00:00Z" }] } : null);
  fixtures.manageLists.mockImplementation(async (_: string, operation: string) => {
    if (operation === "publish") fixtures.list.is_public = true;
    if (operation === "unpublish") fixtures.list.is_public = false;
    return [{ ...fixtures.list }];
  });
});

test("anonymous visitors can read a public list without login or edit controls", async () => {
  fixtures.list.is_public = true;
  history.replaceState(null,"",`/public/lists/${fixtures.list.id}`);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("heading", { name: "友達" })).toBeVisible();
  await expect.element(screen.getByText("公開された投稿")).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "リストを編集" })).not.toBeInTheDocument();
  expect(fixtures.manageLists).not.toHaveBeenCalled();
  await screen.unmount();
});
test("private links show unavailable instead of list details", async () => {
  history.replaceState(null,"",`/public/lists/${fixtures.list.id}`);
  const screen = await render(<App />);
  await expect.element(screen.getByText("このリストは公開されていないか、削除されています。")).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "友達" })).not.toBeInTheDocument();
  await screen.unmount();
});
test("owners can publish and unpublish and sharing controls follow visibility", async () => {
  fixtures.user = { id: "alice" };
  history.replaceState(null,"",`/lists/${fixtures.list.id}`);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "リストを公開", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "共有リンク" })).toHaveValue(`${location.origin}/public/lists/${fixtures.list.id}`);
  await screen.getByRole("button", { name: "非公開にする", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "共有リンク" })).not.toBeInTheDocument();
  expect(fixtures.list.is_public).toBe(false);
  await screen.unmount();
});
