import SwiftUI

struct HomeView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Bindable var store: PostStore
    var posts: [Post]
    var isSearching: Bool
    var onQuote: (Post) -> Void = { _ in }
    var onReply: (Post) -> Void = { _ in }
    var onOpen: (Post) -> Void = { _ in }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if posts.isEmpty {
                    emptyState
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
                            replyCount: store.replyCount(of: post),
                            replyParent: post.replyTo.flatMap { id in store.posts.first { $0.id == id } }
                        )
                        Rectangle()
                            .fill(Color.irukaHairline)
                            .frame(height: 1)
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.irukaBackground)
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Text(L(isSearching ? "該当する投稿がありません。" : "まだ投稿がありません"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.irukaInk)
            if !isSearching {
                Text(L("70字以内で、いまの気持ちを残しましょう。"))
                    .font(.system(size: 14))
                    .foregroundStyle(Color.irukaSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 28)
        .padding(.top, 72)
    }
}
