import SwiftUI

struct UserListsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(UserListStore.self) private var listStore
    @Environment(PostStore.self) private var postStore
    @Environment(\.irukaPalette) private var palette
    @State private var newName = ""
    @State private var nameToCreate = ""
    @State private var createAlert = false
    @State private var renameTarget: UserListRow?
    @State private var renameText = ""
    @State private var deleteTarget: UserListRow?
    @State private var error: String?

    var body: some View {
        List {
            if let error { Text(L(error)).foregroundStyle(.red) }
            Section(L("新しいリスト")) {
                TextField(L("リスト名（1〜40文字）"), text: $newName).textInputAutocapitalization(.sentences)
                    .onSubmit { beginCreate() }
                Button(L("リストを作成")) { beginCreate() }.disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            Section(L("リスト")) {
                if listStore.lists.isEmpty {
                    Text(L("まだリストがありません。")).foregroundStyle(palette.secondary)
                } else {
                    ForEach(listStore.lists) { row in
                        NavigationLink {
                            UserListDetailView(list: row)
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(row.name).font(.headline)
                                Text(L("メンバー") + " · " + String(row.memberCount)).font(.caption).foregroundStyle(palette.secondary)
                            }
                        }
                        .contextMenu {
                            Button(L("名前を変更")) { renameTarget = row; renameText = row.name }
                            Button(L("リストを削除"), role: .destructive) { deleteTarget = row }
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(palette.background)
        .navigationTitle(L("リスト"))
        .task(id: auth.user?.id) {
            listStore.configure(userId: auth.user?.id ?? (DevelopmentData.isActive ? DevelopmentData.userId : nil))
            await listStore.refresh()
        }
        .refreshable { await listStore.refresh() }
        .alert(L("新しいリスト"), isPresented: $createAlert) {
            TextField(L("リスト名"), text: $nameToCreate)
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("作成")) { Task { await create(nameToCreate) } }
        }
        .alert(L("名前を変更"), isPresented: Binding(get: { renameTarget != nil }, set: { if !$0 { renameTarget = nil } })) {
            TextField(L("リスト名"), text: $renameText)
            Button(L("キャンセル"), role: .cancel) { renameTarget = nil }
            Button(L("保存")) { if let row = renameTarget { Task { await rename(row, renameText) } } }
        }
        .confirmationDialog(L("リストを削除しますか？"), isPresented: Binding(get: { deleteTarget != nil }, set: { if !$0 { deleteTarget = nil } }), titleVisibility: .visible) {
            Button(L("削除"), role: .destructive) { if let row = deleteTarget { Task { await remove(row) } } }
            Button(L("キャンセル"), role: .cancel) { deleteTarget = nil }
        } message: { Text(L("リストとメンバー登録を削除します。投稿やユーザーは削除されません。")) }
    }

    private func beginCreate() {
        guard !newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        nameToCreate = newName; createAlert = true
    }
    private func create(_ name: String) async {
        do { try await listStore.create(id: UUID(), name: name); newName = ""; error = nil }
        catch { self.error = error.localizedDescription == "リスト名は1〜40文字で入力してください。" ? error.localizedDescription : "リストを保存できませんでした。" }
    }
    private func rename(_ row: UserListRow, _ name: String) async {
        do { try await listStore.rename(id: row.id, name: name); error = nil }
        catch { self.error = error.localizedDescription == "リスト名は1〜40文字で入力してください。" ? error.localizedDescription : "リストを保存できませんでした。" }
        renameTarget = nil
    }
    private func remove(_ row: UserListRow) async {
        do { try await listStore.delete(id: row.id); error = nil }
        catch { error = "リストを保存できませんでした。" }
        deleteTarget = nil
    }
}

private struct UserListDetailView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(UserListStore.self) private var listStore
    @Environment(PostStore.self) private var postStore
    @Environment(\.irukaPalette) private var palette
    @Environment(\.dismiss) private var dismiss
    let list: UserListRow
    @State private var members: [ListMemberRow] = []
    @State private var posts: [Post] = []
    @State private var accounts: [ListAccountRow] = []
    @State private var query = ""
    @State private var selection = "投稿"
    @State private var error: String?
    @State private var loading = true
    @State private var saving = false
    @State private var renameText = ""
    @State private var showRename = false
    @State private var showDelete = false
    private var displayedName: String { listStore.lists.first(where: { $0.id == list.id })?.name ?? list.name }

    var body: some View {
        List {
            if let error { Text(L(error)).foregroundStyle(.red) }
            Section {
                Picker(L("表示"), selection: $selection) {
                    Text(L("投稿")).tag("投稿")
                    Text(L("メンバー")).tag("メンバー")
                }.pickerStyle(.segmented)
            }
            if selection == "投稿" {
                Section(L("投稿")) {
                    if loading { ProgressView(L("読み込み中…")) }
                    else if posts.isEmpty { Text(L("このリストに表示できる投稿はありません。メンバーを追加してください。")).foregroundStyle(palette.secondary) }
                    else {
                        ForEach(posts) { post in
                            NavigationLink(value: post) { PostRowView(post: post) }
                                VStack(alignment: .leading, spacing: 2) {
                                    NavigationLink(value: post) { PostRowView(post: post) }
                                    HStack(spacing: 8) {
                                        LikeButton(post: post) { toggleLike(post) }
                                        BookmarkButton(postId: post.id)
                                    }
                                }
                        }
                    }
                }
            } else {
                Section(L("メンバーを追加")) {
                    TextField(L("名前やユーザー名で検索"), text: $query)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    ForEach(accounts) { account in
                        let included = members.contains { $0.targetId == account.id }
                        HStack {
                            VStack(alignment: .leading) {
                                Text(account.name)
                                if let handle = account.handle { Text("@\(handle)").font(.caption).foregroundStyle(palette.secondary) }
                            }
                            Spacer()
                            Button(L(included ? "登録済み" : "追加")) { Task { await changeMember(account.id, included: !included) } }
                                .disabled(saving || included)
                        }
                    }
                }
                Section(L("登録メンバー")) {
                    if members.isEmpty { Text(L("まだメンバーがいません。")).foregroundStyle(palette.secondary) }
                    ForEach(members) { member in
                        HStack {
                            Text(member.isBlocked ? L("ブロック中のアカウント") : (member.targetName ?? L("ユーザー")))
                            Spacer()
                            Button(L("解除")) { Task { await changeMember(member.targetId, included: false) } }.disabled(saving)
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(palette.background)
        .navigationTitle(displayedName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button(L("名前を変更")) { renameText = displayedName; showRename = true }
                    Button(L("リストを削除"), role: .destructive) { showDelete = true }
                } label: { Image(systemName: "ellipsis") }
            }
        }
        .navigationDestination(for: Post.self) { post in PostDetailView(initialPost: post, store: postStore) }
        .task(id: "\(list.id):\(auth.user?.id ?? "")") { await refresh() }
        .task(id: query) {
            let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { accounts = []; return }
            do { accounts = try await listStore.search(trimmed) }
            catch { self.error = "ユーザーを検索できませんでした。" }
        }
        .refreshable { await refresh() }
        .alert(L("名前を変更"), isPresented: $showRename) {
            TextField(L("リスト名"), text: $renameText)
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("保存")) { Task {
                do { try await listStore.rename(id: list.id, name: renameText); error = nil }
                catch { error = "リストを保存できませんでした。" }
            } }
        }
        .confirmationDialog(L("リストを削除しますか？"), isPresented: $showDelete, titleVisibility: .visible) {
            Button(L("削除"), role: .destructive) { Task {
                do { try await listStore.delete(id: list.id); error = nil; dismiss() }
                catch { error = "リストを保存できませんでした。" }
            } }
            Button(L("キャンセル"), role: .cancel) {}
        } message: { Text(L("リストとメンバー登録を削除します。投稿やユーザーは削除されません。")) }
    }

    private func refresh() async {
        loading = true
        do {
            let rows = try await listStore.posts(id: list.id)
            members = try await listStore.members(id: list.id)
            let likes: [PostLikeStats]
            if rows.isEmpty || DevelopmentData.isActive { likes = [] }
            else { likes = try await IrukaDatabase.client.rpc("get_post_likes", params: LikeStatsParams(post_ids: rows.map(\.id))).execute().value }
            let profiles = try await ProfileService.fetch(ids: rows.compactMap(\.userId))
            let profileById = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            let likeById = Dictionary(uniqueKeysWithValues: likes.map { ($0.postId, $0) })
            posts = rows.map { row in
                let profile = row.userId.flatMap { profileById[$0] }
                var post = Post(id: row.id, authorName: profile?.name ?? row.authorName,
                    handle: profile?.handle.map { "@" + $0 } ?? row.handle,
                    initial: profile.map { String($0.name.prefix(1)) } ?? row.initial,
                    body: row.body, createdAt: row.createdAt, isMine: row.userId == auth.user?.id,
                    avatarIndex: row.avatarIndex, userId: row.userId, parentId: row.parentId, avatarUrl: profile?.avatarUrl)
                if let like = likeById[row.id] { post.likedByMe = like.isLiked; post.storedLikeCount = like.likeCount }
                return post
            }
            error = nil
        } catch { error = "リストを読み込めませんでした。" }
        loading = false
    }
    private func changeMember(_ target: String, included: Bool) async {
        saving = true
        do { try await listStore.setMember(listId: list.id, targetId: target, included: included); await refresh(); error = nil }
        catch { error = "リストを保存できませんでした。" }
        saving = false
    }
    private func toggleLike(_ post: Post) {
        guard let user = auth.user else { return }
        if DevelopmentData.isActive {
            postStore.toggleLike(id: post.id)
            if let next = postStore.timeline.first(where: { $0.id == post.id }),
               let index = posts.firstIndex(where: { $0.id == post.id }) { posts[index] = next }
            return
        }
        Task {
            do {
                let rows: [PostLikeStats] = try await IrukaDatabase.client.rpc("set_post_like", params: SetLikeParams(target_post_id: post.id, liked: !post.isLiked, expected_user_id: user.id)).execute().value
                guard let state = rows.first, let index = posts.firstIndex(where: { $0.id == post.id }) else { return }
                posts[index].likedByMe = state.isLiked; posts[index].storedLikeCount = state.likeCount
            } catch { error = "いいねを保存できませんでした。もう一度試してください。" }
        }
    }
}

struct ListMembershipSheet: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(\.dismiss) private var dismiss
    @Environment(UserListStore.self) private var store
    let targetId: String
    @State private var selected: Set<UUID> = []
    @State private var loaded = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                if let error { Text(L(error)).foregroundStyle(.red) }
                ForEach(store.lists) { row in
                    Toggle(row.name, isOn: Binding(get: { selected.contains(row.id) }, set: { value in Task { await toggle(row, value) } }))
                        .disabled(!loaded)
                }
                if store.lists.isEmpty, loaded {
                    NavigationLink(L("リストを作成")) { UserListsView() }
                }
            }
            .navigationTitle(L("リストに追加"))
            .navigationBarTitleDisplayMode(.inline)
            .task {
                store.configure(userId: store.userId ?? DevelopmentData.userId)
                await store.refresh()
                do {
                    var values: Set<UUID> = []
                    for row in store.lists {
                        let members = try await store.members(id: row.id)
                        if members.contains(where: { $0.targetId == targetId }) { values.insert(row.id) }
                    }
                    selected = values
                } catch { self.error = "リストを読み込めませんでした。" }
                loaded = true
            }
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(L("閉じる")) { dismiss() } } }
        }
    }
    private func toggle(_ row: UserListRow, _ included: Bool) async {
        do { try await store.setMember(listId: row.id, targetId: targetId, included: included)
            if included { selected.insert(row.id) } else { selected.remove(row.id) }
        } catch { self.error = "リストを保存できませんでした。" }
    }
}

