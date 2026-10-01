import SwiftUI

struct HomeView: View {
    @Environment(AuthManager.self) private var auth
    @Bindable var store: PostStore
    @Binding var showsComposer: Bool
    @Binding var showsSignIn: Bool

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("いま、みんなが書いている")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                    Text("70字までの短い投稿")
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
                        NavigationLink("プロフィール") { ProfileView(profileId: userId, store: store) }
                            .font(.subheadline)
                            .foregroundStyle(Color.irukaBlue)
                    }
                    LikeButton(post: post) { store.toggleLike(id: post.id) }
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
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                openComposer()
            } label: {
                Text("投稿する")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.irukaBlue)
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 8)
        }
    }

    private func openComposer() {
        if auth.user == nil {
            showsSignIn = true
        } else {
            showsComposer = true
        }
    }
}

struct MineView: View {
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
                    Text("今週の投稿")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowSeparator(.hidden)
            }

            if let user = auth.user {
                Section {
                    NavigationLink("プロフィールを見る・編集") {
                        ProfileView(profileId: user.id, store: store)
                    }
                }
            }

            if auth.user == nil {
                SignInView(title: "自分の投稿", message: "ログインすると、この端末を超えて自分の投稿が見られます。")
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
            } else if store.mine.isEmpty {
                ContentUnavailableView("まだ投稿がありません", systemImage: "fish", description: Text("70字以内で、いまの気持ちを残しましょう。"))
                    .listRowSeparator(.hidden)
            } else {
                ForEach(store.mine) { post in
                    VStack(alignment: .leading, spacing: 0) {
                        NavigationLink(value: post) {
                            PostRowView(post: post, showsAuthor: false)
                        }
                        LikeButton(post: post) { store.toggleLike(id: post.id) }
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
                    Button("ログアウト") {
                        Task { await auth.signOut() }
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                if auth.user == nil {
                    showsSignIn = true
                } else {
                    showsComposer = true
                }
            } label: {
                Text(auth.user == nil ? "ログイン" : "新しく投稿")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.irukaBlue)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
        }
    }
}
