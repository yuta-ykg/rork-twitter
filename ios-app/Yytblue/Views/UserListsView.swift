import SwiftUI

struct UserListsView: View {
    @Environment(UserListStore.self) private var lists
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @State private var creating = false
    var body: some View {
        List {
            Text(L(DevelopmentData.isActive ? "リストはこの端末に保存されます。" : "リストは自分だけに表示され、端末間で共有されます。"))
                .font(.footnote).foregroundStyle(.secondary)
            if lists.loading { ProgressView() }
            if let error = lists.error {
                Text(L(error)).foregroundStyle(.red)
                Button(L("再読み込み")) { Task { await lists.refresh() } }
            }
            ForEach(lists.lists) { list in
                NavigationLink {
                    UserListDetailView(listId: list.id, store: store)
                } label: {
                    VStack(alignment: .leading) {
                        Text(list.name).font(.headline)
                        if !list.description.isEmpty { Text(list.description).font(.subheadline).foregroundStyle(.secondary) }
                        Text("\(L("メンバー")): \(list.members.count)").font(.caption)
                    }
                }
            }
            if lists.lists.isEmpty && !lists.loading { Text(L("まだリストがありません。")) }
        }
        .navigationTitle(L("リスト"))
        .toolbar { Button(L("リストを作成"), systemImage: "plus") { creating = true }.disabled(lists.busy) }
        .sheet(isPresented: $creating) { UserListEditor(list: nil) }
        .task(id: auth.user?.id) { await lists.refresh() }
        .refreshable { await lists.refresh(); await store.refresh(userId: auth.user?.id) }
    }
}

struct UserListDetailView: View {
    let listId: UUID
    @Environment(UserListStore.self) private var lists
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PostStore
    @State private var editing = false
    @State private var deleting = false
    @State private var keyword = ""
    @State private var results: [ListMember] = []
    @State private var searching = false
    @State private var searchVersion = 0
    @State private var searchError: String?
    private var list: UserList? { lists.lists.first { $0.id == listId } }
    private var timeline: [Post] {
        let members = Set(list?.members.map(\.id) ?? [])
        return store.timeline.filter { $0.parentId == nil && members.contains($0.userId ?? "") }
    }
    var body: some View {
        List {
            if let list {
                if !list.description.isEmpty { Text(list.description) }
                if let error = lists.error { Text(L(error)).foregroundStyle(.red) }
                Section(L("メンバー")) {
                    ForEach(list.members) { member in
                        HStack {
                            NavigationLink(value: ProfileRoute(id: member.id)) { Text("\(member.name) @\(member.handle ?? "")") }
                            Button(L("解除")) { Task { await lists.perform("remove", id: listId, member: member) } }
                                .buttonStyle(.borderless).disabled(lists.busy)
                        }
                    }
                    if list.members.isEmpty { Text(L("ユーザーを追加すると投稿が表示されます。")) }
                    TextField(L("ユーザー名・表示名"), text: $keyword)
                        .onChange(of: keyword) { _, _ in searchVersion += 1; results = []; searching = false }
                    Button(L(searching ? "読み込み中…" : "ユーザーを検索")) { search() }
                        .disabled(searching || keyword.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || keyword.unicodeScalars.count > 40)
                    if let searchError { Text(L(searchError)).foregroundStyle(.red) }
                    ForEach(results) { member in
                        HStack {
                            Text("\(member.name) @\(member.handle ?? "")")
                            Spacer()
                            Button(L("追加")) { Task { await lists.perform("add", id: listId, member: member) } }
                                .buttonStyle(.borderless).disabled(lists.busy || list.members.contains { $0.id == member.id })
                        }
                    }
                }
                Section(L("リストの投稿")) {
                    ForEach(timeline) { post in
                        VStack(alignment: .leading) {
                            PostRowView(post: post)
                            HStack { LikeButton(post: post) { store.toggleLike(id: post.id) }; BookmarkButton(postId: post.id) }
                        }
                    }
                    if timeline.isEmpty { Text(L("まだ投稿がありません。")) }
                }
                Button(L("リストを削除"), role: .destructive) { deleting = true }.disabled(lists.busy)
            } else { Text(L("リストが見つかりません。")) }
        }
        .navigationTitle(list?.name ?? L("リスト"))
        .toolbar { Button(L("リストを編集")) { editing = true }.disabled(list == nil || lists.busy) }
        .sheet(isPresented: $editing) { if let list { UserListEditor(list: list) } }
        .alert(L("リストを削除しますか？"), isPresented: $deleting) {
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("削除する"), role: .destructive) {
                Task { if await lists.perform("delete", id: listId) { dismiss() } }
            }
        } message: { Text(L("リストとメンバー設定が削除されます。投稿は削除されません。")) }
        .refreshable { await lists.refresh(); await store.refresh(userId: auth.user?.id) }
        .onDisappear { searchVersion += 1 }
    }
    private func search() {
        searchVersion += 1
        let version = searchVersion; let userId = auth.user?.id; let query = keyword
        searching = true; results = []; searchError = nil
        Task {
            do {
                let next = try await lists.search(query)
                if version == searchVersion && userId == auth.user?.id { results = next }
            } catch { if version == searchVersion { searchError = "ユーザーを検索できませんでした。" } }
            if version == searchVersion { searching = false }
        }
    }
}

struct UserListEditor: View {
    let list: UserList?
    @Environment(UserListStore.self) private var lists
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""
    var body: some View {
        NavigationStack {
            Form {
                TextField(L("リスト名（1〜40文字）"), text: $name)
                TextField(L("説明（160文字まで）"), text: $description, axis: .vertical)
                if let error = lists.error { Text(L(error)).foregroundStyle(.red) }
            }
            .navigationTitle(L(list == nil ? "リストを作成" : "リストを編集"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(L("キャンセル")) { dismiss() }.disabled(lists.busy) }
                ToolbarItem(placement: .confirmationAction) {
                    Button(L("保存")) { Task {
                        if await lists.perform(list == nil ? "create" : "update", id: list?.id, name: name, description: description) { dismiss() }
                    } }.disabled(lists.busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || name.unicodeScalars.count > 40 || description.unicodeScalars.count > 160)
                }
            }
            .onAppear { name = list?.name ?? ""; description = list?.description ?? "" }
        }
        .interactiveDismissDisabled(lists.busy)
    }
}
