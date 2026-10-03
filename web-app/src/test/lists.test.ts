import { filterListPosts, updateLocalLists, validateList, type UserList } from "../lib/listModel";

const member = { id: "alice", name: "Alice", handle: "alice" };
describe("private user lists", () => {
  it("creates, edits and deletes a list without changing another list", () => {
    const first = updateLocalLists([], "create", "first", "  Friends  ", "People I know");
    const second = updateLocalLists(first, "create", "second", "Work");
    const edited = updateLocalLists(second, "update", "first", "Close friends", "Updated");
    expect(edited.find((list) => list.id === "first")?.name).toBe("Close friends");
    expect(updateLocalLists(edited, "delete", "first")).toEqual([second[0]]);
    expect(first[0].name).toBe("Friends");
  });
  it("adds members idempotently and removes only the selected member", () => {
    let lists = updateLocalLists([], "create", "first", "Friends");
    lists = updateLocalLists(lists, "add", "first", "", "", member);
    lists = updateLocalLists(lists, "add", "first", "", "", member);
    expect(lists[0].members).toEqual([member]);
    expect(updateLocalLists(lists, "remove", "first", "", "", member)[0].members).toEqual([]);
  });
  it("rejects blank names, overlong Unicode text and unknown lists", () => {
    expect(() => validateList("   ", "")).toThrow();
    expect(() => validateList("😀".repeat(41), "")).toThrow();
    expect(() => validateList("Valid", "あ".repeat(161))).toThrow();
    expect(() => validateList("😀".repeat(40), "あ".repeat(160))).not.toThrow();
    expect(() => updateLocalLists([], "add", "missing", "", "", member)).toThrow();
  });
  it("includes only member-authored root posts, preserving timeline order", () => {
    const list: UserList = { id: "list", name: "Friends", description: "", members: [member] };
    const posts = [{ id: 1, userId: "alice" }, { id: 2, userId: "bob" },
      { id: 3, userId: "alice", parentId: "parent" }, { id: 4, userId: null }, { id: 5, userId: "alice" }];
    expect(filterListPosts(posts, list).map((post) => post.id)).toEqual([1, 5]);
    expect(filterListPosts(posts, { ...list, members: [] })).toEqual([]);
  });
  it("does not publish device-local lists or silently claim they are shared", () => {
    const lists = updateLocalLists([], "create", "local", "Local list");
    expect(() => updateLocalLists(lists, "publish", "local")).toThrow("公開するには");
    expect(lists[0].is_public).not.toBe(true);
  });
});
