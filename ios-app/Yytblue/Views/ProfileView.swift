import SwiftUI

struct ProfileView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let profileId: String
    @Bindable var store: PostStore
    @Environment(AuthManager.self) private var auth
    @Environment(RelationshipStore.self) private var relationships
    @State private var profile: IrukaProfile?
    @State private var loading = true
    @State private var error: String?
    @State private var editing = false
    @State private var retry = 0
    @State private var relationBusy = false
    @State private var showingLists = false

    private var own: Bool { auth.user?.id == profileId }
    private var userPosts: [Post] { store.timeline.filter { $0.userId == profileId } }

    var body: some View {
        List {
            if !own, auth.user != nil {
                Section {
                    Button(relationships.isMuted(profileId) ? L("ミュートを解除") : L("ミュート")) {
                        changeRelationship("mute", active: !relationships.isMuted(profileId))
                    }
                    Button(relationships.isBlocked(profileId) ? L("ブロックを解除") : L("ブロック")) {
                        changeRelationship("block", active: !relationships.isBlocked(profileId))
                    }
                    .foregroundStyle(relationships.isBlocked(profileId) ? Color.primary : Color.red)
                }
                .disabled(relationBusy)
            }
            if loading {
                ProgressView(L("読み込み中…"))
            } else if let profile {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        AvatarView(initial: String(profile.name.prefix(1)), index: 0, url: profile.avatarUrl)
                        Text(profile.name).font(.title2.bold())
                        if let handle = profile.handle { Text("@\(handle)").foregroundStyle(Color.irukaSecondary) }
                        if !profile.bio.isEmpty { Text(profile.bio).font(.body) }
                        Text(L("post_count", profile.postCount)).foregroundStyle(Color.irukaSecondary)
                        if own { Button(L("プロフィールを編集")) { editing = true }.buttonStyle(.bordered) }
                        if !own { Button(L("リストに追加")) { showingLists = true }.buttonStyle(.bordered) }
                    }
                    .padding(.vertical, 12)
                }
                Section(L("投稿")) {
                    if userPosts.isEmpty {
                        Text(L("まだ投稿がありません。")).foregroundStyle(Color.irukaSecondary)
                    } else {
                        ForEach(userPosts) { post in
                            VStack(alignment: .leading, spacing: 0) {
                                NavigationLink(value: post) { PostRowView(post: post, showsAuthor: false) }
                                HStack(spacing: 8) {
                                    LikeButton(post: post) { store.toggleLike(id: post.id) }
                                    BookmarkButton(postId: post.id)
                                }
                            }
                        }
                    }
                }
            } else {
                Text(L(error ?? "プロフィールが見つかりません。"))
                Button(L("再読み込み")) { retry += 1 }
            }
        }
        .listStyle(.plain)
        .navigationTitle(L("プロフィール"))
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingLists) { ListMembershipSheet(targetId: profileId) }
        .task(id: "\(profileId):\(auth.user?.id ?? ""):\(retry)") {
            loading = true
            error = nil
            do {
                if let user = auth.user, own { try await ProfileService.ensure(user) }
                let next = try await ProfileService.fetch(ids: [profileId]).first
                await store.refresh(userId: auth.user?.id)
                guard !Task.isCancelled else { return }
                profile = next
            } catch {
                guard !Task.isCancelled else { return }
                self.error = "プロフィールを読み込めませんでした。"
                profile = nil
            }
            loading = false
        }
        .sheet(isPresented: $editing) {
            if let profile, own {
                ProfileEditor(profile: profile) { next in
                    self.profile = next
                    Task { await store.refresh(userId: auth.user?.id) }
                }
                .environment(auth)
            }
        }
    }

    private func changeRelationship(_ kind: String, active: Bool) {
        relationBusy = true
        Task {
            do {
                try await relationships.set(targetId: profileId, kind: kind, active: active)
                await store.refresh(userId: auth.user?.id)
                retry += 1
            } catch {
                self.error = "設定を保存できませんでした。"
            }
            relationBusy = false
        }
    }
}

private struct ProfileEditor: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let profile: IrukaProfile
    let onSave: (IrukaProfile) -> Void
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var handle = ""
    @State private var bio = ""
    @State private var avatar = ""
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section(L("表示名（1〜40文字）")) { TextField(L("表示名"), text: $name) }
                Section(L("ユーザー名（英数字と_、3〜25文字）")) {
                    TextField(L("ユーザー名"), text: $handle)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                Section(L("自己紹介（160文字まで）")) {
                    TextEditor(text: $bio).frame(minHeight: 120)
                    Text("\(bio.unicodeScalars.count) / 160").foregroundStyle(Color.irukaSecondary)
                }
                Section(L("プロフィール画像URL")) {
                    TextField("https://", text: $avatar)
                        .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    Text(L("HTTPSの画像URL。空欄にすると画像を解除します。")).font(.footnote)
                }
                if let error { Text(L(error)).foregroundStyle(.red) }
            }
            .navigationTitle(L("プロフィール編集"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L("キャンセル")) { dismiss() }.disabled(saving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? L("保存中…") : L("保存")) {
                        guard auth.user?.id == profile.id, !saving else { return }
                        saving = true
                        error = nil
                        Task {
                            defer { saving = false }
                            do {
                                let next = try await ProfileService.save(
                                    id: profile.id, name: name, handle: handle.lowercased(), bio: bio,
                                    avatar: avatar.trimmingCharacters(in: .whitespacesAndNewlines)
                                )
                                guard auth.user?.id == profile.id else { return }
                                onSave(next)
                                dismiss()
                            } catch { self.error = "保存できませんでした。入力内容とユーザー名の重複を確認してください。" }
                        }
                    }.disabled(saving || auth.user?.id != profile.id)
                }
            }
            .onAppear {
                name = profile.name
                handle = profile.handle ?? ""
                bio = profile.bio
                avatar = profile.avatarUrl ?? ""
            }
        }
        .interactiveDismissDisabled(saving)
    }
}
