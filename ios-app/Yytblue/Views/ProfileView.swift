import SwiftUI

enum ProfileSort: String, CaseIterable, Identifiable {
    case newest, oldest, likes, reposts, replies
    var id: String { rawValue }
    var title: String {
        switch self {
        case .newest: "新しい順"
        case .oldest: "古い順"
        case .likes: "いいね数順"
        case .reposts: "リポスト数順"
        case .replies: "コメント数順"
        }
    }
}

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
    @State private var sort: ProfileSort = .newest

    private var shown: [Post] {
        let base = showsReposts ? store.timeline.filter { $0.isReposted ?? false } : store.mine
        guard !showsReposts else { return base }
        let score: (Post) -> Int = { post in
            switch sort {
            case .likes: post.likeCount ?? 0
            case .reposts: post.repostCount ?? 0
            case .replies: store.replyCount(of: post)
            default: 0
            }
        }
        return base.sorted { a, b in
            switch sort {
            case .newest: return a.createdAt > b.createdAt
            case .oldest: return a.createdAt < b.createdAt
            default:
                let sa = score(a), sb = score(b)
                return sa != sb ? sa > sb : a.createdAt > b.createdAt
            }
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                header
                HStack(spacing: 0) {
                    postsTab
                    tabButton(L("リポスト"), selected: showsReposts, icon: "arrow.2.squarepath") { showsReposts = true }
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
        .background(Color.irukaBackground)
        .navigationTitle(profile?.name ?? auth.user?.displayName ?? L("プロフィール"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showsEdit) {
            if let profile {
                EditProfileView(store: store, profile: profile) { self.profile = $0 }
            }
        }
        .task(id: auth.user?.id) { await load() }
    }

    @ViewBuilder
    private var postsTab: some View {
        if showsReposts {
            tabButton(L("投稿"), selected: false, chevron: true) { showsReposts = false }
        } else {
            Menu {
                Picker(L("並び替え"), selection: $sort) {
                    ForEach(ProfileSort.allCases) { option in
                        Text(L(option.title)).tag(option)
                    }
                }
            } label: {
                tabLabel(L("投稿"), selected: true, icon: nil, chevron: true)
            }
            .buttonStyle(.plain)
        }
    }

    private func tabLabel(_ title: String, selected: Bool, icon: String?, chevron: Bool) -> some View {
        HStack(spacing: 6) {
            if let icon { Image(systemName: icon).font(.system(size: 14, weight: .semibold)) }
            Text(title)
            if chevron { Image(systemName: "chevron.down").font(.system(size: 11, weight: .bold)) }
        }
        .font(.system(size: 15, weight: selected ? .bold : .regular))
        .foregroundStyle(selected ? Color.irukaInk : Color.irukaSecondary)
        .frame(maxWidth: .infinity, minHeight: 48)
        .overlay(alignment: .bottom) {
            if selected { Capsule().fill(Color.irukaBlue).frame(width: 48, height: 4) }
        }
        .contentShape(Rectangle())
    }

    private func tabButton(_ title: String, selected: Bool, icon: String? = nil, chevron: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            tabLabel(title, selected: selected, icon: icon, chevron: chevron)
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
