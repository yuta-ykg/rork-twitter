export type ListMember = { id: string; name: string; handle: string | null };
export type UserList = { id: string; name: string; description: string; members: ListMember[] };
export type ListOperation = "read" | "create" | "update" | "delete" | "add" | "remove";
export function validateList(name: string, description: string): void {
  if (!name.trim() || Array.from(name.trim()).length > 40 || Array.from(description).length > 160) {
    throw new Error("リスト名は1〜40文字、説明は160文字以内で入力してください。");
  }
}
export function updateLocalLists(lists: UserList[], operation: ListOperation, id: string,
  name = "", description = "", member?: ListMember): UserList[] {
  if (operation === "read") return lists;
  if (operation === "create" || operation === "update") validateList(name, description);
  if (operation === "create") {
    if (lists.some((list) => list.id === id)) throw new Error("リストを保存できませんでした。");
    return [{ id, name: name.trim(), description, members: [] }, ...lists];
  }
  if (!lists.some((list) => list.id === id)) throw new Error("リストが見つかりません。");
  if (operation === "delete") return lists.filter((list) => list.id !== id);
  if ((operation === "add" || operation === "remove") && !member) throw new Error("ユーザーが見つかりません。");
  return lists.map((list) => {
    if (list.id !== id) return list;
    if (operation === "update") return { ...list, name: name.trim(), description };
    if (operation === "remove") return { ...list, members: list.members.filter((item) => item.id !== member!.id) };
    return list.members.some((item) => item.id === member!.id) ? list : { ...list, members: [...list.members, member!] };
  });
}
export function filterListPosts<T extends { userId?: string | null; parentId?: string | null }>(posts: T[], list: UserList): T[] {
  const ids = new Set(list.members.map((member) => member.id));
  return posts.filter((post) => !post.parentId && Boolean(post.userId && ids.has(post.userId)));
}
