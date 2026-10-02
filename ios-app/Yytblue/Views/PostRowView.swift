import SwiftUI

struct PostRowView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let post: Post
    var showsAuthor: Bool = true

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            profileLink {
                AvatarView(initial: post.initial, index: post.avatarIndex, url: post.avatarUrl)
            }
            VStack(alignment: .leading, spacing: 3) {
                if showsAuthor {
                    profileLink {
                        Text(post.authorName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.irukaInk)
                            .multilineTextAlignment(.leading)
                    }
                }
                if post.parentId != nil { Text(L("返信")).font(.caption).foregroundStyle(.secondary) }
                NavigationLink(value: post) {
                    Text(post.body)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.irukaInk)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .buttonStyle(.plain)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 12)
    }

    /// アイコンと表示名のタップで投稿者のプロフィールへ遷移する。
    /// 開発モードなど userId が無い投稿はリンクにならない。
    @ViewBuilder
    private func profileLink<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        if let userId = post.userId {
            NavigationLink(value: ProfileRoute(id: userId)) { content() }
                .buttonStyle(.plain)
                .accessibilityLabel(L("プロフィール"))
        } else {
            content()
        }
    }
}

struct AvatarView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let initial: String
    let index: Int
    var url: String? = nil

    var body: some View {
        Group {
            if let url, let imageURL = URL(string: url), imageURL.scheme == "https" {
                AsyncImage(url: imageURL) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else { Text(initial) }
                }
            } else { Text(initial) }
        }
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(Color.irukaInk.opacity(0.72))
            .frame(width: 46, height: 46)
            .background(Color(hex: AvatarPalette.fills[index % AvatarPalette.fills.count]), in: Circle())
            .clipShape(Circle())
            .accessibilityHidden(true)
    }
}

struct LikeButton: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-like-icon") private var iconChoice = LikeIcon.heart.rawValue
    private var icon: LikeIcon { LikeIcon(rawValue: iconChoice) ?? .heart }
    let post: Post
    let onLike: () -> Void

    var body: some View {
        Button(action: onLike) {
            Label("\(post.likeCount)", systemImage: icon.symbol(liked: post.isLiked))
                .font(.system(size: 15))
                .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(.borderless)
        .foregroundStyle(post.isLiked ? icon.selectedColor : Color.irukaSecondary)
        .accessibilityLabel(post.isLiked ? L("いいねを取り消す") : L("いいね"))
        .accessibilityValue(L("like_count", post.likeCount))
    }
}

enum LikeIcon: String, CaseIterable, Identifiable {
    case heart, star, thumbsUp = "thumbs-up", upvote
    var id: String { rawValue }
    var title: String {
        switch self {
        case .heart: L("デフォルト")
        case .star: L("ふぁぼ")
        case .thumbsUp: L("高評価")
        case .upvote: L("賛成")
        }
    }
    var selectedColor: Color {
        switch self {
        case .heart: .pink
        case .star, .upvote: .orange
        case .thumbsUp: .blue
        }
    }
    func symbol(liked: Bool) -> String {
        let name: String
        switch self {
        case .heart: name = "heart"
        case .star: name = "star"
        case .thumbsUp: name = "hand.thumbsup"
        case .upvote: name = "arrowshape.up"
        }
        return name + (liked ? ".fill" : "")
    }
}
