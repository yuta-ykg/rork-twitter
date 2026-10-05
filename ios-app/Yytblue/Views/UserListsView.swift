import SwiftUI

struct UserListsView: View {
    @Environment(UserListStore.self) private var lists
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @State private var creating = false
    @State private var publicLists: [UserList] = []
    @State private var publicQuery = ""
    @State private var publicError: String?
    var body: some View {
        List {
            Text(L(DevelopmentData.isActive ? "リストはこの端末に保存されます。" : "リストは初期状態では非公開です。公開すると共有リンクから誰でも閲覧できます。"))
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
                        Text(L(list.isPublic == true ? "公開" : "非公開")).font(.caption)
                        if !list.description.isEmpty { Text(list.description).font(.subheadline).foregroundStyle(.secondary) }
                        Text("\(L("メンバー")): \(list.members.count)").font(.caption)
                    }
                }
            }
            if lists.lists.isEmpty && !lists.loading { Text(L("まだリストがありません。")) }
            if !DevelopmentData.isActive {
                Section(L("公開リストを探す")) {
                    TextField(L("リスト名で検索"), text: $publicQuery)
                    if let publicError {
                        Text(L(publicError)).foregroundStyle(.red)
                        Button(L("再読み込み")) { Task { await loadPublicLists() } }
                    }
                    ForEach(publicLists) { list in
                        NavigationLink { PublicUserListView(id: list.id) } label: { Text(list.name) }
                    }
                }
            }
        }
        .navigationTitle(L("リスト"))
        .toolbar { Button(L("リストを作成"), systemImage: "plus") { creating = true }.disabled(lists.busy) }
        .sheet(isPresented: $creating) { UserListEditor(list: nil) }
        .task(id: auth.user?.id) { await lists.refresh() }
        .task(id: "\(auth.user?.id ?? ""):\(publicQuery)") { await loadPublicLists() }
        .refreshable { await lists.refresh(); await store.refresh(userId: auth.user?.id) }
    }
    private func loadPublicLists() async {
        publicLists = []; publicError = nil
        guard !DevelopmentData.isActive, publicQuery.unicodeScalars.count <= 40 else { return }
        do {
            let result = try await PublicListService.find(publicQuery)
            if !Task.isCancelled { publicLists = result }
        } catch { if !Task.isCancelled { publicError = "公開リストを読み込めませんでした。" } }
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
                Section(L(list.isPublic == true ? "公開" : "非公開")) {
                    if DevelopmentData.isActive { Text(L("公開するにはAppleかGoogleでログインしてください。")) }
                    else {
                        Button(L(list.isPublic == true ? "非公開にする" : "リストを公開")) {
                            Task { await lists.perform(list.isPublic == true ? "unpublish" : "publish", id: listId) }
                        }.disabled(lists.busy)
                        if list.isPublic == true {
                            NavigationLink(L("公開ページを見る")) { PublicUserListView(id: listId) }
                            if let url = PublicListService.shareURL(listId) {
                                ShareLink(item: url) { Label(L("共有リンク"), systemImage: "square.and.arrow.up") }
                            }
                        }
                    }
                }
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

struct ListMembershipSheet: View {
    let targetId: String
    @Environment(UserListStore.self) private var lists
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var member: ListMember?
    @State private var loading = true
    @State private var creating = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                if loading { ProgressView() }
                if let error { Text(L(error)).foregroundStyle(.red) }
                if !loading, lists.lists.isEmpty {
                    Text(L("まだリストがありません。"))
                    Button(L("リストを作成")) { creating = true }
                }
                ForEach(lists.lists) { list in
                    let included = member.map { person in list.members.contains { $0.id == person.id } } ?? false
                    Button {
                        guard let member else { return }
                        Task {
                            let succeeded = await lists.perform(included ? "remove" : "add", id: list.id, member: member)
                            if !succeeded { error = lists.error }
                        }
                    } label: {
                        HStack {
                            Text(list.name)
                            Spacer()
                            Image(systemName: included ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(included ? Color.accentColor : Color.secondary)
                        }
                    }
                    .disabled(loading || lists.busy || member == nil)
                }
            }
            .navigationTitle(L("リストに追加"))
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(L("閉じる")) { dismiss() } } }
            .sheet(isPresented: $creating) { UserListEditor(list: nil) }
            .task(id: "\(auth.user?.id ?? ""):\(targetId)") {
                loading = true; error = nil
                await lists.refresh()
                do {
                    let profiles = try await ProfileService.fetch(ids: [targetId])
                    member = profiles.first.map {
                        ListMember(id: $0.id, name: $0.name, handle: $0.handle)
                    }
                    if member == nil { error = "プロフィールが見つかりません。" }
                } catch { self.error = "プロフィールを読み込めませんでした。" }
                loading = false
            }
        }
    }
}
