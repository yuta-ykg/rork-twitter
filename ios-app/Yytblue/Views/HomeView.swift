import SwiftUI

struct HomeView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Bindable var store: PostStore
    var posts: [Post]
    var isSearching: Bool

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if posts.isEmpty {
                    emptyState
                } else {
                    ForEach(posts) { post in
                        TweetRow(post: post)
                        Rectangle()
                            .fill(Color.irukaHairline)
                            .frame(height: 1)
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.white)
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
