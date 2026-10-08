import SwiftUI

struct ProfileView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    var onQuote: (Post) -> Void = { _ in }
    var onReply: (Post) -> Void = { _ in }
    var onOpen: (Post) -> Void = { _ in }

    @State private var profile: IrukaProfile?
    @State private var showsEdit = false
    @State private var showsReposts = false

    private var shown: [Post] {
        showsReposts ? store.timeline.filter { $0.isReposted ?? false } : store.mine
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                header
                HStack(spacing: 0) {
                    tabButton(L("投稿"), selected: !showsReposts) { showsReposts = false }
                    tabButton(L("リポスト"), selected: showsReposts) { showsReposts = true }
                }
                .overlay(alignment: .top) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
                .overlay(alignment: .bottom) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
                if shown.isEmpty {
                    Text(L(showsReposts ? "まだリポストがありません" : "まだ投稿がありません"))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.irukaInk)
                        .padding(.top, 48)
                } else {
                    ForEach(shown) { post in
                        TweetRow(
                            post: post,
                            quoted: post.quoteOf.flatMap { id in store.posts.first { $0.id == id } },
                            onLike: { store.toggleLike(post) },
                            onRepost: { store.toggleRepost(post) },
                            onQuote: { onQuote(post) },
                            onReply: { onReply(post) },
                            onOpen: { onOpen(post) },
                            replyCount: store.replyCount(of: post),
                            replyParent: post.replyTo.flatMap { id in store.posts.first { $0.id == id } }
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
        .navigationDestination(isPresented: $showsEdit) {
            if let profile {
                EditProfileView(store: store, profile: profile) { self.profile = $0 }
            }
        }
        .task(id: auth.user?.id) { await load() }
    }

    private func tabButton(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: selected ? .bold : .regular))
                .foregroundStyle(selected ? Color.irukaInk : Color.irukaSecondary)
                .frame(maxWidth: .infinity, minHeight: 48)
                .overlay(alignment: .bottom) {
                    if selected { Capsule().fill(Color.irukaBlue).frame(width: 48, height: 4) }
                }
        }
        .buttonStyle(.plain)
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
                if profile != nil {
                    Button(L("プロフィールを編集")) { showsEdit = true }
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

    private func load() async {
        guard let id = auth.user?.id else { return }
        profile = try? await ProfileService.fetch(ids: [id]).first
    }
}
