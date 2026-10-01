import SwiftUI

struct PostRowView: View {
    let post: Post
    var showsAuthor: Bool = true

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(initial: post.initial, index: post.avatarIndex)
            VStack(alignment: .leading, spacing: 3) {
                if showsAuthor {
                    Text(post.authorName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.irukaInk)
                }
                Text(post.body)
                    .font(.system(size: 16))
                    .foregroundStyle(Color.irukaInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }
}

struct AvatarView: View {
    let initial: String
    let index: Int

    var body: some View {
        Text(initial)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(Color.irukaInk.opacity(0.72))
            .frame(width: 46, height: 46)
            .background(Color(hex: AvatarPalette.fills[index % AvatarPalette.fills.count]), in: Circle())
            .accessibilityHidden(true)
    }
}
