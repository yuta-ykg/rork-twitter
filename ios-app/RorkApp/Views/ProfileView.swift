import SwiftUI

struct ProfileView: View {
    @Environment(\.irukaPalette) private var palette
    let profileId: String
    @Bindable var store: PostStore
    @Environment(AuthManager.self) private var auth
    @State private var profile: IrukaProfile?
    @State private var loading = true
    @State private var error: String?
    @State private var editing = false
    @State private var retry = 0

    private var own: Bool { auth.user?.id == profileId }
    private var userPosts: [Post] { store.timeline.filter { $0.userId == profileId } }

    var body: some View {
        List {
            if loading {
                ProgressView("読み込み中…")
            } else if let profile {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        AvatarView(initial: String(profile.name.prefix(1)), index: 0, url: profile.avatarUrl)
                        Text(profile.name).font(.title2.bold())
                        if let handle = profile.handle { Text("@\(handle)").foregroundStyle(palette.secondary) }
                        if !profile.bio.isEmpty { Text(profile.bio).font(.body) }
                        Text("\(profile.postCount) 投稿").foregroundStyle(palette.secondary)
                        if own { Button("プロフィールを編集") { editing = true }.buttonStyle(.bordered) }
                    }
                    .padding(.vertical, 12)
                }
                Section("投稿") {
                    if userPosts.isEmpty {
                        Text("まだ投稿がありません。").foregroundStyle(palette.secondary)
                    } else {
                        ForEach(userPosts) { post in
                            VStack(alignment: .leading, spacing: 0) {
                                NavigationLink(value: post) { PostRowView(post: post, showsAuthor: false) }
                                LikeButton(post: post) { store.toggleLike(id: post.id) }
                            }
                        }
                    }
                }
            } else {
                Text(error ?? "プロフィールが見つかりません。")
                Button("再読み込み") { retry += 1 }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(palette.background)
        .navigationTitle("プロフィール")
        .navigationBarTitleDisplayMode(.inline)
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
}

private struct ProfileEditor: View {
    @Environment(\.irukaPalette) private var palette
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
                Section("表示名（1〜40文字）") { TextField("表示名", text: $name) }
                Section("ユーザー名（英数字と_、3〜25文字）") {
                    TextField("ユーザー名", text: $handle)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                Section("自己紹介（160文字まで）") {
                    TextEditor(text: $bio).frame(minHeight: 120)
                    Text("\(bio.unicodeScalars.count) / 160").foregroundStyle(palette.secondary)
                }
                Section("プロフィール画像URL") {
                    TextField("https://", text: $avatar)
                        .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    Text("HTTPSの画像URL。空欄にすると画像を解除します。").font(.footnote)
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
            .scrollContentBackground(.hidden)
            .background(palette.background)
            .navigationTitle("プロフィール編集")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { dismiss() }.disabled(saving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "保存中…" : "保存") {
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
