import SwiftUI

struct BookmarksView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(BookmarkStore.self) private var bookmarks
    @Environment(\.irukaPalette) private var palette
    @Bindable var store: PostStore

    private var savedPosts: [Post] {
        guard auth.user != nil else { return [] }
        let byId = Dictionary(uniqueKeysWithValues: store.posts.map { ($0.id, $0) })
        return bookmarks.ids.filter { bookmarks.contains($0, userId: auth.user?.id) }.compactMap { byId[$0] }
    }

    var body: some View {
        List {
            Text(L("ブックマークはこの端末に保存されます。"))
                .font(.subheadline)
                .foregroundStyle(palette.secondary)
                .listRowSeparator(.hidden)
            if auth.user == nil {
                SignInView(title: L("ブックマーク"), message: L("ブックマークするにはログインしてください。"))
                    .listRowSeparator(.hidden)
            } else if savedPosts.isEmpty {
                ContentUnavailableView(L("まだブックマークがありません。"), systemImage: "bookmark")
                    .listRowSeparator(.hidden)
            } else {
                ForEach(savedPosts) { post in
                    VStack(alignment: .leading, spacing: 0) {
                        NavigationLink(value: post) { PostRowView(post: post) }
                        HStack(spacing: 8) {
                            LikeButton(post: post) { store.toggleLike(id: post.id) }
                            BookmarkButton(postId: post.id)
                        }
                        .padding(.leading, 58)
                    }
                    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(palette.background)
        .navigationTitle(L("ブックマーク"))
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await store.refresh(userId: auth.user?.id) }
    }
}
