import SwiftUI

struct HomeView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-timeline-mode") private var timelineMode = "recommended"
    @Environment(AuthManager.self) private var auth
    @Environment(BookmarkStore.self) private var bookmarks
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool
    @Binding var showsSignIn: Bool

    var body: some View {
        List {
            Section {
                Button {
                    if auth.user == nil { showsSignIn = true } else { showsComposer = true }
                } label: {
                    HStack(spacing: 12) {
                        Text(auth.user?.initial ?? "い")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.irukaInk.opacity(0.7))
                            .frame(width: 36, height: 36)
                            .background(Color.irukaBlue.opacity(0.12), in: Circle())
                        Text(L("いまどうしてる？"))
                            .font(.system(size: 17))
                            .foregroundStyle(Color.irukaSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
            }

            Section {
                Picker(L("タイムラインの表示順"), selection: $timelineMode) {
                    Text(L("おすすめ")).tag("recommended")
                    Text(L("新着順")).tag("latest")
                }
                .pickerStyle(.segmented)
                if timelineMode == "recommended" {
                    Text(L("いいね・ブックマーク・自分の投稿を手がかりに、話題の近い投稿を優先します。"))
                        .font(.caption)
                        .foregroundStyle(Color.irukaSecondary)
                }
            }
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))

            ForEach(timeline) { post in
                VStack(alignment: .leading, spacing: 0) {
                    PostRowView(post: post)
                    HStack(spacing: 8) {
                        LikeButton(post: post) { store.toggleLike(id: post.id) }
                        BookmarkButton(postId: post.id)
                    }
                        .padding(.leading, 58)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Color.white)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Wordmark()
            }
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink { CommunitiesView() } label: { Label(L("コミュニティ"), systemImage: "person.3") }
            }
        }

    }

    private var timeline: [Post] {
        guard timelineMode != "latest" else { return store.timeline }
        return TimelineRecommender.rank(posts: store.posts, bookmarkedIds: Set(bookmarks.ids))
    }

}

struct MineView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool
    @Binding var showsSignIn: Bool

    var body: some View {
        List {
            Section {
                VStack(spacing: 4) {
                    Text("\(store.thisWeekCount)")
                        .font(.system(size: 56, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                        .monospacedDigit()
                    Text(L("今週の投稿"))
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowSeparator(.hidden)
            }

            if let user = auth.user {
                Section {
                    NavigationLink(L("プロフィールを見る・編集")) {
                        ProfileView(profileId: user.id, store: store)
                    }
                }
            }

            if auth.user == nil {
                SignInView(title: L("自分の投稿"), message: L("ログインすると、この端末を超えて自分の投稿が見られます。"))
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
            } else if store.mine.isEmpty {
                ContentUnavailableView(L("まだ投稿がありません"), systemImage: "fish", description: Text(L("70字以内で、いまの気持ちを残しましょう。")))
                    .listRowSeparator(.hidden)
            } else {
                ForEach(store.mine) { post in
                    VStack(alignment: .leading, spacing: 0) {
                        PostRowView(post: post, showsAuthor: false)
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
        .background(Color.white)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Wordmark()
            }
            if auth.user != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(L("ログアウト")) {
                        Task { await auth.signOut() }
                    }
                }
            }
        }

    }
}
