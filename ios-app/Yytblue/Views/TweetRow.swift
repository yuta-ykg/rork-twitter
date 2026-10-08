import SwiftUI

/// Twitter風の投稿行。返信・リポスト・いいね・共有は見た目だけで、操作はしない。
struct TweetRow: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let post: Post

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            AvatarView(initial: post.initial, index: post.avatarIndex, url: post.avatarUrl, size: 40)
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(post.authorName)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Color.irukaInk)
                        .lineLimit(1)
                    Text(post.handle)
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaSecondary)
                        .lineLimit(1)
                    Text("·")
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaSecondary)
                    Text(TweetAge.label(for: post.createdAt, language: language))
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaSecondary)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.irukaSecondary)
                        .accessibilityHidden(true)
                }
                tweetBody
                    .font(.system(size: 15))
                    .fixedSize(horizontal: false, vertical: true)
                if let urlString = post.imageUrl, let url = URL(string: urlString) {
                    Color(.secondarySystemBackground)
                        .frame(height: 220)
                        .overlay {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                ProgressView()
                            }
                            .allowsHitTesting(false)
                        }
                        .clipShape(.rect(cornerRadius: 16))
                        .overlay { RoundedRectangle(cornerRadius: 16).stroke(Color.irukaHairline, lineWidth: 1) }
                        .padding(.top, 8)
                        .accessibilityLabel(L("投稿の画像"))
                }
                actionRow
                    .padding(.top, 8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(post.authorName) \(post.handle). \(post.body)")
    }

    private var tweetBody: Text {
        var result = Text("")
        var rest = post.body[...]
        while let hash = rest.firstIndex(of: "#") {
            let before = rest[..<hash]
            if !before.isEmpty {
                result = result + Text(String(before)).foregroundStyle(Color.irukaInk)
            }
            let after = rest[hash...]
            let end = after.dropFirst().firstIndex(where: { $0.isWhitespace }) ?? after.endIndex
            result = result + Text(String(after[..<end])).foregroundStyle(Color.irukaBlue)
            rest = after[end...]
        }
        if !rest.isEmpty {
            result = result + Text(String(rest)).foregroundStyle(Color.irukaInk)
        }
        return result
    }

    private var actionRow: some View {
        HStack(spacing: 0) {
            actionIcon("bubble.left")
            actionIcon("arrow.2.squarepath")
            actionIcon("heart")
            actionIcon("square.and.arrow.up")
        }
        .accessibilityHidden(true)
    }

    private func actionIcon(_ symbol: String) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 15, weight: .regular))
            .foregroundStyle(Color.irukaSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 22)
    }
}

enum TweetAge {
    static func label(for date: Date, language: String) -> String {
        let minutes = max(0, Int(Date().timeIntervalSince(date) / 60))
        let japanese = language == AppLanguage.ja.rawValue
        if minutes < 1 { return japanese ? "たった今" : "now" }
        if minutes < 60 { return japanese ? "\(minutes)分" : "\(minutes)m" }
        let hours = minutes / 60
        if hours < 24 { return japanese ? "\(hours)時間" : "\(hours)h" }
        let days = hours / 24
        if days < 7 { return japanese ? "\(days)日" : "\(days)d" }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }
}
