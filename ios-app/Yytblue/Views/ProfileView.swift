import SwiftUI

struct ProfileView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    var onQuote: (Post) -> Void = { _ in }

    @State private var profile: IrukaProfile?
    @State private var isEditing = false
    @State private var name = ""
    @State private var handle = ""
    @State private var bio = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var handleIsValid: Bool { handle.wholeMatch(of: ProfileService.handlePattern) != nil }
    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && handleIsValid && !isSaving
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                header
                if isEditing { editForm }
                Text(L("投稿"))
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color.irukaInk)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .overlay(alignment: .top) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
                    .overlay(alignment: .bottom) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
                if store.mine.isEmpty {
                    Text(L("まだ投稿がありません"))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.irukaInk)
                        .padding(.top, 48)
                } else {
                    ForEach(store.mine) { post in
                        TweetRow(
                            post: post,
                            quoted: post.quoteOf.flatMap { id in store.posts.first { $0.id == id } },
                            onLike: { store.toggleLike(post) },
                            onRepost: { store.toggleRepost(post) },
                            onQuote: { onQuote(post) }
                        )
                        Rectangle().fill(Color.irukaHairline).frame(height: 1)
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.white)
        .navigationTitle(profile?.name ?? auth.user?.displayName ?? L("プロフィール"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: auth.user?.id) { await load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                AvatarView(
                    initial: String((profile?.name ?? auth.user?.initial ?? "あ").prefix(1)),
                    index: 0,
                    url: profile?.avatarUrl ?? auth.user?.picture,
                    size: 72
                )
                Spacer()
                if profile != nil, !isEditing {
                    Button(L("プロフィールを編集")) { beginEditing() }
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 44)
                        .overlay { Capsule().stroke(Color.irukaHairline, lineWidth: 1.5) }
                }
            }
            Text(profile?.name ?? auth.user?.displayName ?? "")
                .font(.system(size: 20, weight: .heavy))
                .foregroundStyle(Color.irukaInk)
                .padding(.top, 8)
            Text("@" + (profile?.handle ?? ""))
                .font(.system(size: 15))
                .foregroundStyle(Color.irukaSecondary)
            if let bio = profile?.bio, !bio.isEmpty {
                Text(bio)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.irukaInk)
                    .padding(.top, 8)
            }
            HStack(spacing: 16) {
                if let created = profile?.createdAt {
                    Label(created.formatted(.dateTime.year().month()) + L("から利用"), systemImage: "calendar")
                }
                Text("\(store.mine.count) " + L("投稿"))
            }
            .font(.system(size: 14))
            .foregroundStyle(Color.irukaSecondary)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }

    private var editForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            field(L("名前"), text: $name)
            VStack(alignment: .leading, spacing: 4) {
                field(L("ハンドル"), text: $handle, prefix: "@")
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: handle) { _, new in handle = new.lowercased() }
                if !handle.isEmpty, !handleIsValid {
                    Text(L("英小文字・数字・_ の3〜25文字"))
                        .font(.system(size: 12)).foregroundStyle(.red)
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(L("自己紹介")).font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
                TextField("", text: $bio, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(10)
                    .overlay { RoundedRectangle(cornerRadius: 8).stroke(Color.irukaHairline, lineWidth: 1.5) }
                    .onChange(of: bio) { _, new in if new.count > 160 { bio = String(new.prefix(160)) } }
                Text("\(bio.count)/160").font(.system(size: 12)).foregroundStyle(Color.irukaSecondary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            if let errorMessage {
                Text(L(errorMessage)).font(.system(size: 13)).foregroundStyle(.red)
            }
            HStack(spacing: 8) {
                Button { Task { await save() } } label: {
                    Text(L("保存"))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .frame(minHeight: 44)
                        .background(Color.irukaInk, in: Capsule())
                }
                .disabled(!canSave)
                .opacity(canSave ? 1 : 0.4)
                Button { isEditing = false } label: {
                    Text(L("キャンセル"))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                        .padding(.horizontal, 20)
                        .frame(minHeight: 44)
                        .overlay { Capsule().stroke(Color.irukaHairline, lineWidth: 1.5) }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }

    private func field(_ title: String, text: Binding<String>, prefix: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
            HStack(spacing: 4) {
                if let prefix { Text(prefix).foregroundStyle(Color.irukaSecondary) }
                TextField("", text: text)
            }
            .padding(10)
            .frame(minHeight: 44)
            .overlay { RoundedRectangle(cornerRadius: 8).stroke(Color.irukaHairline, lineWidth: 1.5) }
        }
    }

    private func beginEditing() {
        name = profile?.name ?? ""
        handle = profile?.handle ?? ""
        bio = profile?.bio ?? ""
        errorMessage = nil
        isEditing = true
    }

    private func load() async {
        guard let id = auth.user?.id else { return }
        profile = try? await ProfileService.fetch(ids: [id]).first
    }

    private func save() async {
        guard let id = auth.user?.id, canSave else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            profile = try await ProfileService.save(
                userId: id, name: name.trimmingCharacters(in: .whitespacesAndNewlines), handle: handle, bio: bio)
            await store.refresh(userId: id)
            isEditing = false
        } catch {
            let text = String(describing: error)
            errorMessage = text.contains("23505") || text.contains("Handle taken")
                ? "このハンドルは使われています" : "保存できませんでした。もう一度試してください。"
        }
    }
}
