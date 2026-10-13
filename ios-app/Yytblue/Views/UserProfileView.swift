import SwiftUI

/// 他のユーザーのプロフィール。フォロー操作と投稿一覧。
struct UserProfileView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    let userId: String
    var onQuote: (Post) -> Void = { _ in }
    var onReply: (Post) -> Void = { _ in }
    var onOpen: (Post) -> Void = { _ in }

    @State private var profile: IrukaProfile?
    @State private var info: FollowInfo?
    @State private var isUpdating = false
    @State private var failed = false

    private var posts: [Post] {
        store.timeline.filter { $0.userId == userId && $0.replyTo == nil }
    }

    private var name: String { profile?.name ?? posts.first?.authorName ?? "" }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                header
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
                if posts.isEmpty {
                    Text(L("まだ投稿がありません"))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.irukaInk)
                        .padding(.top, 48)
                } else {
                    ForEach(posts) { post in
                        TweetRow(
                            post: post,
                            quoted: post.quoteOf.flatMap { id in store.posts.first { $0.id == id } },
                            onLike: { store.toggleLike(post) },
                            onRepost: { store.toggleRepost(post) },
                            onQuote: { onQuote(post) },
                            onReply: { onReply(post) },
                            onOpen: { onOpen(post) },
                            replyCount: store.replyCount(of: post)
                        )
                        Rectangle().fill(Color.irukaHairline).frame(height: 1)
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.irukaBackground)
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
        .alert(L("フォローできませんでした。"), isPresented: $failed) { Button("OK") {} }
        .task(id: userId) { await load() }
    }

    private var header: some View {
        let following = info?.isFollowing ?? false
        return VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                AvatarView(initial: String(name.prefix(1)), index: 0, url: profile?.avatarUrl, size: 72)
                Spacer()
                Button {
                    Task { await toggle(!following) }
                } label: {
                    Text(following ? L("フォロー中") : (info?.followsYou ?? false ? L("フォローバック") : L("フォロー")))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(following ? Color.irukaInk : Color.irukaBackground)
                        .padding(.horizontal, 18)
                        .frame(minWidth: 96, minHeight: 44)
                        .background(following ? Color.clear : Color.irukaInk, in: Capsule())
                        .overlay { if following { Capsule().stroke(Color.irukaHairline, lineWidth: 1.5) } }
                }
                .buttonStyle(.plain)
                .disabled(info == nil || isUpdating)
            }
            Text(name)
                .font(.system(size: 20, weight: .heavy))
                .foregroundStyle(Color.irukaInk)
                .padding(.top, 8)
            HStack(spacing: 8) {
                Text(profile?.handle.map { "@" + $0 } ?? posts.first?.handle ?? "")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.irukaSecondary)
                if info?.followsYou ?? false {
                    Text(L("フォローされています"))
                        .font(.system(size: 12))
                        .foregroundStyle(Color.irukaSecondary)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 4))
                }
            }
            if let bio = profile?.bio, !bio.isEmpty {
                Text(bio)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.irukaInk)
                    .padding(.top, 8)
            }
            HStack(spacing: 16) {
                countLabel(info?.followingCount ?? 0, L("フォロー中"))
                countLabel(info?.followerCount ?? 0, L("フォロワー"))
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }

    private func countLabel(_ count: Int, _ title: String) -> some View {
        HStack(spacing: 4) {
            Text("\(count)").font(.system(size: 14, weight: .bold)).foregroundStyle(Color.irukaInk)
            Text(title).font(.system(size: 14)).foregroundStyle(Color.irukaSecondary)
        }
    }

    private func load() async {
        profile = try? await ProfileService.fetch(ids: [userId]).first
        guard let me = auth.user?.id else { return }
        info = try? await FollowService.info(targetId: userId, userId: me)
    }

    private func toggle(_ next: Bool) async {
        guard let me = auth.user?.id, var current = info else { return }
        isUpdating = true
        defer { isUpdating = false }
        let original = current
        current.isFollowing = next
        current.followerCount = max(0, current.followerCount + (next ? 1 : -1))
        info = current
        store.setFollowing(userId, next)
        do {
            try await FollowService.setFollow(targetId: userId, active: next, userId: me)
        } catch {
            info = original
            store.setFollowing(userId, original.isFollowing)
            failed = true
        }
    }
}
