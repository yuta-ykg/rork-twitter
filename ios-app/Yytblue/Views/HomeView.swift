import SwiftUI

struct HomeView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool
    @Binding var showsSignIn: Bool

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L("いま、みんなが書いている"))
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                    Text(L("70字までの短い投稿"))
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaSecondary)
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 12, trailing: 20))
            }

            ForEach(store.timeline) { post in
                VStack(alignment: .leading, spacing: 0) {
                    NavigationLink(value: post) {
                        PostRowView(post: post)
                    }
                    if let userId = post.userId {
                        NavigationLink(L("プロフィール")) { ProfileView(profileId: userId, store: store) }
                            .font(.subheadline)
                            .foregroundStyle(Color.irukaBlue)
                    }
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
        }

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
                        NavigationLink(value: post) {
                            PostRowView(post: post, showsAuthor: false)
                        }
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
