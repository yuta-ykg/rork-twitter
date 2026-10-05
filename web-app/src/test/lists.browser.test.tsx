import { render } from "vitest-browser-react";
import { AuthProvider } from "@/hooks/useAuth";
import App from "@/App";
import { clearLocalData, endDevelopmentSession, startGuestSession } from "@/lib/development";
import { insertPost } from "@/lib/posts";

test("a guest can create a private list, add a member, view posts, edit and delete the list", async () => {
  localStorage.clear();
  history.replaceState(null, "", "/lists");
  const guest = startGuestSession();
  await insertPost("リストに表示する投稿", guest);
  const screen = await render(<AuthProvider><App /></AuthProvider>);
  await screen.getByRole("button", { name: "リストを作成", exact: true }).click();
  await screen.getByRole("textbox", { name: "リスト名（1〜40文字）" }).fill("友達");
  await screen.getByRole("textbox", { name: "説明（160文字まで）" }).fill("友達の投稿");
  await screen.getByRole("button", { name: "保存", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "友達", exact: true })).toBeVisible();
  await screen.getByRole("textbox", { name: "ユーザーを検索" }).fill("guest");
  await screen.getByRole("button", { name: "検索", exact: true }).click();
  await screen.getByRole("button", { name: "追加", exact: true }).click();
  await expect.element(screen.getByRole("link", { name: "リストに表示する投稿", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "リストを編集", exact: true }).click();
  await screen.getByRole("textbox", { name: "リスト名（1〜40文字）" }).fill("親しい友達");
  await screen.getByRole("button", { name: "保存", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "親しい友達", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "ゲスト: リストから削除", exact: true }).click();
  await expect.element(screen.getByRole("link", { name: "リストに表示する投稿", exact: true })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "リストを削除", exact: true }).click();
  await screen.getByRole("button", { name: "削除する", exact: true }).click();
  await expect.element(screen.getByText("まだリストがありません。")).toBeVisible();
  await screen.unmount();
  clearLocalData(); endDevelopmentSession();
});

test("guest lists are removed even when the session ends before cleanup", async () => {
  const { manageLists } = await import("@/lib/lists");
  const guest = startGuestSession();
  await manageLists(guest.id, "create", crypto.randomUUID(), "Temporary");
  const key = `iruka:lists:${encodeURIComponent(guest.id)}`;
  expect(localStorage.getItem(key)).not.toBeNull();
  endDevelopmentSession(); clearLocalData();
  expect(localStorage.getItem(key)).toBeNull();
});
