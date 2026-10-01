import SwiftUI

struct PostDetailView: View {
    let post: Post

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) {
                    AvatarView(initial: post.initial, index: post.avatarIndex)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(post.authorName)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color.irukaInk)
                        Text(post.handle)
                            .font(.system(size: 15))
                            .foregroundStyle(Color.irukaSecondary)
                    }
                }

                Text(post.body)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(Color.irukaInk)
                    .fixedSize(horizontal: false, vertical: true)

                Divider()

                HStack(alignment: .top, spacing: 0) {
                    metaColumn(title: "投稿時刻", value: timeLabel)
                    Rectangle()
                        .fill(Color.irukaHairline)
                        .frame(width: 1, height: 36)
                    metaColumn(title: "文字数", value: "\(post.characterCount)字")
                }
            }
            .padding(20)
        }
        .background(Color.white)
        .navigationTitle("投稿")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
    }

    private var timeLabel: String {
        let calendar = Calendar.current
        let time = post.createdAt.formatted(date: .omitted, time: .shortened)
        if calendar.isDateInToday(post.createdAt) {
            return "今朝 \(time)"
        }
        if calendar.isDateInYesterday(post.createdAt) {
            return "昨日 \(time)"
        }
        return post.createdAt.formatted(date: .abbreviated, time: .shortened)
    }

    private func metaColumn(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
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
