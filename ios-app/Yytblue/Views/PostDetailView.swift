import SwiftUI

struct PostDetailView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let initialPost: Post
    @Bindable var store: PostStore
    @State private var exportedPDF: ExportedPostPDF?
    @State private var pdfError = false

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

                if let parentId = post.parentId, let parent = store.posts.first(where: { $0.id == parentId }) {
                    NavigationLink(L("返信先の投稿")) { PostDetailView(initialPost: parent, store: store) }
                }

                Text(post.body)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(Color.irukaInk)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 8) {
                    LikeButton(post: post) { store.toggleLike(id: post.id) }
                    BookmarkButton(postId: post.id)
                    Button {
                        do { exportedPDF = ExportedPostPDF(url: try PostPDFExporter.create(post)) }
                        catch { pdfError = true }
                    } label: { Image(systemName: "square.and.arrow.up").frame(minWidth: 44, minHeight: 44) }
                    .accessibilityLabel(L("PDFとして出力"))
                }

                Divider()

                HStack(alignment: .top, spacing: 0) {
                    metaColumn(title: L("投稿時刻"), value: timeLabel)
                    Rectangle()
                        .fill(Color.irukaHairline)
                        .frame(width: 1, height: 36)
                    metaColumn(title: L("文字数"), value: L("characters", post.characterCount))
                }
                Divider()
                Text(L("返信")).font(.title2.bold())
                ReplyComposerView(post: post, store: store).id(post.id.uuidString + (auth.user?.id ?? ""))
                ForEach(store.posts.filter { $0.parentId == post.id }.sorted { $0.createdAt < $1.createdAt }) { reply in
                    NavigationLink { PostDetailView(initialPost: reply, store: store) } label: {
                        PostRowView(post: reply)
                    }
                }
                if !store.posts.contains(where: { $0.parentId == post.id }) {
                    Text(L("まだ返信がありません。")).foregroundStyle(.secondary)
                }
            }
            .padding(20)
        }
        .background(Color.white)
        .task(id: post.id) { await store.refresh(userId: auth.user?.id) }
        .refreshable { await store.refresh(userId: auth.user?.id) }
        .sheet(item: $exportedPDF) { file in PostPDFShareSheet(url: file.url) }
        .alert(L("PDFを作成できませんでした。"), isPresented: $pdfError) { Button("OK") { pdfError = false } }
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
