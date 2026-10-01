import SwiftUI

struct NotificationsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    @Environment(NotificationStore.self) private var notifications
    @Environment(\.irukaPalette) private var palette
    @Bindable var store: PostStore

    private func post(for item: NotificationRow) -> Post {
        store.posts.first { $0.id == item.postId } ?? Post(
            id: item.postId, authorName: auth.user?.displayName ?? "", handle: auth.user?.handle ?? "",
            initial: auth.user?.initial ?? "", body: item.postBody, createdAt: item.date,
            isMine: true, avatarIndex: 0, userId: auth.user?.id
        )
    }

    var body: some View {
        List {
            Text(L("自分の投稿へのいいねをお知らせします。"))
                .font(.subheadline).foregroundStyle(palette.secondary)
            if auth.user == nil {
                SignInView(title: L("通知"), message: L("通知を見るにはログインしてください。"))
            } else if DevelopmentData.isActive {
                Text(L("開発モードでは通知は届きません。"))
            } else if notifications.loading {
                ProgressView(L("読み込み中…"))
            } else if let error = notifications.error {
                Text(L(error))
                Button(L("再読み込み")) { Task { await notifications.refresh() } }
            } else if notifications.rows.isEmpty {
                ContentUnavailableView(L("まだ通知がありません。"), systemImage: "bell")
            } else {
                ForEach(notifications.rows) { item in
                    NavigationLink {
                        PostDetailView(initialPost: post(for: item), store: store)
                    } label: {
                        HStack(alignment: .top, spacing: 10) {
                            Circle().fill(item.readAt == nil ? Color.irukaBlue : .clear)
                                .frame(width: 8, height: 8).padding(.top, 6)
                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.actorName + " " + L("さんがあなたの投稿にいいねしました。"))
                                    .fontWeight(item.readAt == nil ? .semibold : .regular)
                                Text(item.postBody).font(.subheadline).foregroundStyle(palette.secondary)
                                Text(item.date, style: .date).font(.caption).foregroundStyle(palette.secondary)
                            }
                        }
                    }
                    .disabled(notifications.marking || notifications.loadingMore)
                    .simultaneousGesture(TapGesture().onEnded { Task { await notifications.markRead(item.id) } })
                    .accessibilityValue(item.readAt == nil ? L("未読の通知") : "")
                }
                if notifications.hasMore {
                    Button(L("もっと見る")) { Task { await notifications.loadMore() } }
                        .disabled(notifications.loadingMore)
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(L("通知"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if notifications.unreadCount > 0 {
                Button(L("すべて既読にする")) { Task { await notifications.markAllRead() } }
                    .disabled(notifications.marking || notifications.loadingMore)
            }
        }
        .task { await notifications.refresh() }
        .refreshable { await notifications.refresh() }
    }
}
