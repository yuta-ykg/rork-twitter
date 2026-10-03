import SwiftUI

struct CommunitiesView: View {
    @Environment(AuthManager.self) private var auth
    @State private var store = CommunityStore()
    @State private var keyword = ""
    @State private var joinedOnly = false
    @State private var creating = false
    var body: some View {
        List {
            Text(L("誰でも閲覧・参加できます。投稿するには参加が必要です。")).font(.footnote).foregroundStyle(.secondary)
            if DevelopmentData.isActive { Text(L("コミュニティを利用するにはAppleかGoogleでログインしてください。")) }
            TextField(L("コミュニティを検索"), text: $keyword)
            if !DevelopmentData.isActive { Toggle(L("参加中のみ"), isOn: $joinedOnly) }
            if store.loading { ProgressView() }
            if let error = store.error {
                Text(L(error)).foregroundStyle(.red)
                Button(L("再読み込み")) { Task { await store.search(keyword, joinedOnly: joinedOnly) } }
            }
            ForEach(store.communities) { community in
                NavigationLink { CommunityDetailView(id: community.id) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(community.name).font(.headline)
                        Text(community.description).font(.subheadline).foregroundStyle(.secondary)
                        Text("\(L("メンバー")): \(community.memberCount) \(community.isMember ? L("参加中") : "")").font(.caption)
                    }
                }
            }
            if !store.loading && store.communities.isEmpty { Text(L("コミュニティがありません。")) }
        }
        .navigationTitle(L("コミュニティ"))
        .toolbar { if auth.user != nil && !DevelopmentData.isActive { Button(L("コミュニティを作成"), systemImage: "plus") { creating = true } } }
        .sheet(isPresented: $creating, onDismiss: { Task { await store.search(keyword, joinedOnly: joinedOnly) } }) { CommunityEditor(community: nil) }
        .task(id: "\(auth.user?.id ?? ""):\(keyword):\(joinedOnly)") {
            store.configure(userId: auth.user?.id)
            await store.search(keyword, joinedOnly: joinedOnly)
        }
        .refreshable { await store.search(keyword, joinedOnly: joinedOnly) }
    }
}

struct CommunityDetailView: View {
    let id: UUID
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var store = CommunityStore()
    @State private var editing = false
    @State private var draft = ""
    @State private var draftId = UUID()
    @State private var confirmation: CommunityConfirmation?
    private var owner: Bool { store.snapshot?.community.ownerId == auth.user?.id && auth.user != nil }
    private var moderator: Bool { store.snapshot?.role == "moderator" }
    private var canModerate: Bool { owner || moderator }
    var body: some View {
        List {
            if store.loading { ProgressView() }
            if let error = store.error { Text(L(error)).foregroundStyle(.red); Button(L("再読み込み")) { Task { await store.load(id) } } }
            if let snapshot = store.snapshot {
                Text(snapshot.community.description)
                Text("\(L("メンバー")): \(snapshot.community.memberCount)")
                if DevelopmentData.isActive { Text(L("コミュニティを利用するにはAppleかGoogleでログインしてください。")) }
                else if auth.user != nil {
                    if owner {
                        Button(L("コミュニティを編集")) { editing = true }.disabled(store.busy)
                        Button(L("コミュニティを削除"), role: .destructive) { confirmation = CommunityConfirmation(operation: "delete") }.disabled(store.busy)
                    } else if snapshot.membership == "joined" {
                        Button(L("退出する")) { perform("leave") }.disabled(store.busy)
                    } else if snapshot.membership == "removed" { Text(L("参加が制限されています。管理者またはモデレーターに確認してください。")) }
                    else { Button(L("参加する")) { perform("join") }.disabled(store.busy) }
                }
                Section(L("メンバー")) {
                    ForEach(snapshot.members) { member in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(member.name)
                                Text(L(member.role == "owner" ? "管理者" : member.role == "moderator" ? "モデレーター" : member.status == "removed" ? "参加制限中" : "参加中")).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if !member.isOwner {
                                VStack(alignment: .trailing) {
                                    if owner && member.status == "joined" {
                                        Button(L(member.role == "moderator" ? "モデレーターを解除" : "モデレーターにする")) {
                                            perform(member.role == "moderator" ? "demote" : "promote", memberId: member.id)
                                        }.buttonStyle(.borderless).disabled(store.busy)
                                    }
                                    if canModerate && (owner || member.role != "moderator") {
                                        Button(L(member.status == "removed" ? "参加を復帰" : "メンバーを除外")) {
                                            if member.status == "removed" { perform("restore", memberId: member.id) }
                                            else { confirmation = CommunityConfirmation(operation: "remove", memberId: member.id) }
                                        }.buttonStyle(.borderless).disabled(store.busy)
                                    }
                                }
                            }
                        }
                    }
                }
                if snapshot.membership == "joined" && !DevelopmentData.isActive {
                    Section(L("コミュニティに投稿")) {
                        TextField(L("投稿本文"), text: $draft, axis: .vertical).disabled(store.busy)
                            .onChange(of: draft) { _, _ in draftId = UUID() }
                        Text("\(draft.trimmingCharacters(in: .whitespacesAndNewlines).unicodeScalars.count) / 70").font(.caption)
                        Button(L(store.busy ? "送信中…" : "投稿する")) { perform("post", postId: draftId) }
                            .disabled(store.busy || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || draft.trimmingCharacters(in: .whitespacesAndNewlines).unicodeScalars.count > 70)
                    }
                }
                Section(L("コミュニティの投稿")) {
                    if let post = snapshot.pinnedPost { postRow(post, pinned: true) }
                    ForEach(snapshot.posts) { post in postRow(post, pinned: false) }
                    if snapshot.pinnedPost == nil && snapshot.posts.isEmpty { Text(L("まだ投稿がありません。")) }
                    if snapshot.hasMore { Button(L("もっと見る")) { Task { await store.load(id, more: true) } }.disabled(store.busy) }
                }
            } else if !store.loading && store.error == nil { Text(L("コミュニティが見つかりません。")) }
        }
        .navigationTitle(store.snapshot?.community.name ?? L("コミュニティ"))
        .task(id: auth.user?.id) { store.configure(userId: auth.user?.id); draft = ""; await store.load(id) }
        .refreshable { await store.load(id) }
        .sheet(isPresented: $editing, onDismiss: { Task { await store.load(id) } }) { if let community = store.snapshot?.community { CommunityEditor(community: community) } }
        .alert(L(confirmation?.operation == "remove" ? "メンバーを除外しますか？" : confirmation?.operation == "delete_post" ? "投稿を削除しますか？" : "コミュニティを削除しますか？"), isPresented: Binding(get: { confirmation != nil }, set: { if !$0 { confirmation = nil } })) {
            Button(L("キャンセル"), role: .cancel) { confirmation = nil }
            Button(L("実行する"), role: .destructive) {
                if let value = confirmation { perform(value.operation, memberId: value.memberId, postId: value.postId) }
                confirmation = nil
            }
        } message: { Text(L(confirmation?.operation == "remove" ? "管理者またはモデレーターが復帰させるまで、このメンバーは参加・投稿できなくなります。" : confirmation?.operation == "delete" ? "コミュニティ、メンバー情報、すべての投稿が削除されます。この操作は取り消せません。" : "この操作は取り消せません。")) }
    }
    private func postRow(_ post: CommunityPost, pinned: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if pinned { Text(L("固定された投稿")).font(.caption).bold().foregroundStyle(Color.accentColor) }
            Text(post.authorName).font(.headline)
            if let handle = post.handle { Text("@" + handle).font(.caption).foregroundStyle(.secondary) }
            Text(post.body)
            if let date = Self.date(post.createdAt) { Text(date, style: .date).font(.caption).foregroundStyle(.secondary) }
            if !DevelopmentData.isActive && canModerate {
                Button(L(pinned ? "固定を解除" : "投稿を固定")) { perform(pinned ? "unpin_post" : "pin_post", postId: post.id) }.disabled(store.busy)
            }
            if !DevelopmentData.isActive && (canModerate || auth.user?.id == post.userId) {
                Button(L("投稿を削除"), role: .destructive) { confirmation = CommunityConfirmation(operation: "delete_post", postId: post.id) }.disabled(store.busy)
            }
        }
    }
    private func perform(_ operation: String, memberId: String? = nil, postId: UUID? = nil) {
        guard let user = auth.user else { return }
        Task {
            if await store.perform(operation, id: id, user: user, memberId: memberId, postId: postId, body: draft) {
                if operation == "post" { draft = "" }
                if operation == "delete" { dismiss() }
            }
        }
    }
    private static func date(_ text: String) -> Date? {
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime,.withFractionalSeconds]
        return formatter.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }
}

private struct CommunityConfirmation { let operation: String; var memberId: String? = nil; var postId: UUID? = nil }

struct CommunityEditor: View {
    let community: Community?
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var store = CommunityStore()
    @State private var name = ""
    @State private var description = ""
    @State private var newId = UUID()
    var body: some View {
        NavigationStack {
            Form {
                TextField(L("コミュニティ名（1〜40文字）"), text: $name).disabled(store.busy)
                TextField(L("説明（160文字まで）"), text: $description, axis: .vertical).disabled(store.busy)
                if let error = store.error { Text(L(error)).foregroundStyle(.red) }
            }
            .navigationTitle(L(community == nil ? "コミュニティを作成" : "コミュニティを編集"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(L("キャンセル")) { dismiss() }.disabled(store.busy) }
                ToolbarItem(placement: .confirmationAction) { Button(L("保存")) {
                    guard let user = auth.user else { return }
                    Task { if await store.perform(community == nil ? "create" : "update", id: community?.id ?? newId, user: user, name: name, description: description) { dismiss() } }
                }.disabled(store.busy || !CommunityStore.valid(name: name, description: description) || auth.user == nil || DevelopmentData.isActive) }
            }
            .onAppear { name = community?.name ?? ""; description = community?.description ?? "" }
            .task(id: auth.user?.id) { store.configure(userId: auth.user?.id) }
        }.interactiveDismissDisabled(store.busy)
    }
}
