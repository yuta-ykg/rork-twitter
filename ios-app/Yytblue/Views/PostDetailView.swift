import SwiftUI

struct PostDetailView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let initialPost: Post
    @Bindable var store: PostStore

    private var post: Post {
        store.posts.first(where: { $0.id == initialPost.id }) ?? initialPost
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) {
                    AvatarView(initial: post.initial, index: post.avatarIndex, url: post.avatarUrl)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(post.authorName)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color.irukaInk)
                        Text(post.handle)
                            .font(.system(size: 15))
                            .foregroundStyle(Color.irukaSecondary)
                    }
                }

                if let userId = post.userId {
                    NavigationLink(L("プロフィールを見る")) {
                        ProfileView(profileId: userId, store: store)
                    }
                    .foregroundStyle(Color.irukaBlue)
                }

                Text(post.body)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(Color.irukaInk)
                    .fixedSize(horizontal: false, vertical: true)

                LikeButton(post: post) { store.toggleLike(id: post.id) }

                Divider()

                HStack(alignment: .top, spacing: 0) {
                    metaColumn(title: L("投稿時刻"), value: timeLabel)
                    Rectangle()
                        .fill(Color.irukaHairline)
                        .frame(width: 1, height: 36)
                    metaColumn(title: L("文字数"), value: L("characters", post.characterCount))
                }
            }
            .padding(20)
        }
        .background(Color.white)
        .navigationTitle(L("投稿"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
    }

    private var timeLabel: String {
        let calendar = Calendar.current
        let time = post.createdAt.formatted(.dateTime.locale(AppLanguage.locale).hour().minute())
        if calendar.isDateInToday(post.createdAt) {
            return L("today_time", time)
        }
        if calendar.isDateInYesterday(post.createdAt) {
            return L("yesterday_time", time)
        }
        return post.createdAt.formatted(.dateTime.locale(AppLanguage.locale).month().day().hour().minute())
    }

    private func metaColumn(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(L(title))
                .font(.system(size: 13))
                .foregroundStyle(Color.irukaSecondary)
            Text(value)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.irukaInk)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
    }
}
