import SwiftUI

/// Twitter風の投稿行。いいね・リポスト・引用が操作でき、返信・共有は見た目だけ。
struct TweetRow: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let post: Post
    var quoted: Post? = nil
    var onLike: () -> Void = {}
    var onRepost: () -> Void = {}
    var onQuote: () -> Void = {}
    var onReply: () -> Void = {}
    var onOpen: (() -> Void)? = nil
    var replyCount: Int = 0
    var replyParent: Post? = nil

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
                if post.replyTo != nil {
                    Text("\(L("返信先")) \(replyParent?.handle ?? L("投稿"))")
                        .font(.system(size: 13))
                        .foregroundStyle(Color.irukaSecondary)
                }
                Button { onOpen?() } label: {
                    tweetBody
                        .font(.system(size: 15))
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(onOpen == nil)
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
                if post.quoteOf != nil { quoteCard }
                actionRow
                    .padding(.top, 8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)

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
            Button(action: onReply) {
                HStack(spacing: 4) {
                    Image(systemName: "bubble.left").font(.system(size: 15))
                    if replyCount > 0 { Text("\(replyCount)").font(.system(size: 13)).monospacedDigit() }
                }
                .foregroundStyle(Color.irukaSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(L("返信"))
            repostMenu
            likeButton
            actionIcon("square.and.arrow.up").accessibilityHidden(true)
        }
    }

    private var quoteCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let quoted {
                HStack(spacing: 6) {
                    AvatarView(initial: quoted.initial, index: quoted.avatarIndex, url: quoted.avatarUrl, size: 18)
                    Text(quoted.authorName).font(.system(size: 14, weight: .bold)).foregroundStyle(Color.irukaInk).lineLimit(1)
                    Text(quoted.handle).font(.system(size: 14)).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                }
                Text(quoted.body).font(.system(size: 14)).foregroundStyle(Color.irukaInk)
                    .fixedSize(horizontal: false, vertical: true)
                if let urlString = quoted.imageUrl, let url = URL(string: urlString) {
                    Color(.secondarySystemBackground)
                        .frame(height: 140)
                        .overlay {
                            AsyncImage(url: url) { $0.resizable().aspectRatio(contentMode: .fill) } placeholder: { ProgressView() }
                                .allowsHitTesting(false)
                        }
                        .clipShape(.rect(cornerRadius: 12))
                }
            } else {
                Text(L("引用元の投稿は見つかりません"))
                    .font(.system(size: 14)).foregroundStyle(Color.irukaSecondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay { RoundedRectangle(cornerRadius: 16).stroke(Color.irukaHairline, lineWidth: 1) }
        .padding(.top, 8)
    }

    private var repostMenu: some View {
        let reposted = post.isReposted ?? false
        let count = post.repostCount ?? 0
        return Menu {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onRepost()
            } label: {
                Label(L(reposted ? "リポストを取り消す" : "リポスト"), systemImage: "arrow.2.squarepath")
            }
            Button(action: onQuote) {
                Label(L("引用"), systemImage: "quote.opening")
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.2.squarepath")
                    .font(.system(size: 15, weight: reposted ? .bold : .regular))
                if count > 0 {
                    Text("\(count)").font(.system(size: 13)).monospacedDigit()
                }
            }
            .foregroundStyle(reposted ? Color(red: 0, green: 0.729, blue: 0.486) : Color.irukaSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .accessibilityLabel(L("リポスト"))
    }

    private var likeButton: some View {
        let liked = post.isLiked ?? false
        let count = post.likeCount ?? 0
        return Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.spring(duration: 0.25, bounce: 0.5)) { onLike() }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: liked ? "heart.fill" : "heart")
                    .font(.system(size: 15))
                    .symbolEffect(.bounce, value: liked)
                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 13))
                        .monospacedDigit()
                }
            }
            .foregroundStyle(liked ? Color(red: 0.976, green: 0.094, blue: 0.502) : Color.irukaSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L(liked ? "いいねを取り消す" : "いいね"))
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
