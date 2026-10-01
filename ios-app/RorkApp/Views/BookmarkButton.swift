import SwiftUI

struct BookmarkButton: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(BookmarkStore.self) private var bookmarks
    @Environment(\.irukaPalette) private var palette
    let postId: UUID

    private var saved: Bool { bookmarks.contains(postId, userId: auth.user?.id) }

    var body: some View {
        Button { bookmarks.toggle(postId, userId: auth.user?.id) } label: {
            Image(systemName: saved ? "bookmark.fill" : "bookmark")
                .font(.system(size: 17))
                .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(.borderless)
        .foregroundStyle(saved ? palette.blue : palette.secondary)
        .accessibilityLabel(L(saved ? "ブックマークを解除" : "ブックマークに追加"))
        .accessibilityAddTraits(saved ? .isSelected : [])
    }
}
