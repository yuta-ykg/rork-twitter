import SwiftUI

/// 投稿の詳細。返信元・投稿本体・返信一覧を表示する。
struct PostDetailView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Bindable var store: PostStore
    let postId: UUID
    var onQuote: (Post) -> Void = { _ in }
    var onReply: (Post) -> Void = { _ in }
    var onOpen: (Post) -> Void = { _ in }

    private var post: Post? { store.posts.first { $0.id == postId } }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                LazyVStack(spacing: 0) {
                    if let post {
                        if let parentId = post.replyTo, let parent = store.posts.first(where: { $0.id == parentId }) {
                            row(parent)
                                .background(Color.irukaField.opacity(0.5))
                        }
                        row(post, open: false)
                        let replies = store.replies(to: post.id)
                        ForEach(replies) { reply in row(reply) }
                        if replies.isEmpty {
                            Text(L("まだ返信がありません"))
                                .font(.system(size: 15))
                                .foregroundStyle(Color.irukaSecondary)
                                .padding(.top, 40)
                        }
                    } else {
                        Text(L("投稿が見つかりません。"))
                            .foregroundStyle(Color.irukaSecondary)
                            .padding(.top, 60)
                    }
                }
            }
            .scrollIndicators(.hidden)
            if let post {
                Button { onReply(post) } label: {
                    Text(L("返信を投稿"))
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaSecondary)
                        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                        .padding(.horizontal, 16)
                        .overlay(alignment: .top) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
                }
                .buttonStyle(.plain)
            }
        }
        .background(Color.irukaBackground)
        .navigationTitle(L("投稿"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func row(_ item: Post, open: Bool = true) -> some View {
        VStack(spacing: 0) {
            TweetRow(
                post: item,
                quoted: item.quoteOf.flatMap { id in store.posts.first { $0.id == id } },
                onLike: { store.toggleLike(item) },
                onRepost: { store.toggleRepost(item) },
                onQuote: { onQuote(item) },
                onReply: { onReply(item) },
                onOpen: open ? { onOpen(item) } : nil,
                replyCount: store.replyCount(of: item),
                replyParent: item.replyTo.flatMap { id in store.posts.first { $0.id == id } }
            )
            Rectangle().fill(Color.irukaHairline).frame(height: 1)
        }
    }
}
