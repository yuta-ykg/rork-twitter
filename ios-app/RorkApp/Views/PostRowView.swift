import SwiftUI

struct PostRowView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(\.irukaPalette) private var palette
    let post: Post
    var showsAuthor: Bool = true

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(initial: post.initial, index: post.avatarIndex, url: post.avatarUrl)
            VStack(alignment: .leading, spacing: 3) {
                if showsAuthor {
                    Text(post.authorName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(palette.ink)
                }
                Text(post.body)
                    .font(.system(size: 16))
                    .foregroundStyle(palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }
}

struct AvatarView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(\.irukaPalette) private var palette
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
            .foregroundStyle(Color(hex: "#0F1419").opacity(0.72))
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
    @Environment(\.irukaPalette) private var palette
    let post: Post
    let onLike: () -> Void

    var body: some View {
        Button(action: onLike) {
            Label("\(post.likeCount)", systemImage: icon.symbol(liked: post.isLiked))
                .font(.system(size: 15))
                .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(.borderless)
        .foregroundStyle(post.isLiked ? icon.selectedColor : palette.secondary)
        .accessibilityLabel(post.isLiked ? L("いいねを取り消す") : L("いいね"))
        .accessibilityValue(L("like_count", post.likeCount))
    }
}

enum LikeIcon: String, CaseIterable, Identifiable {
    case heart, star
    var id: String { rawValue }
    var title: String { self == .star ? L("星") : L("ハート") }
    var selectedColor: Color { self == .star ? .orange : .pink }
    func symbol(liked: Bool) -> String { rawValue + (liked ? ".fill" : "") }
}
