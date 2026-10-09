import SwiftUI

/// 通知タブ。フラットな行で、未読は薄い青の背景にする。
struct NotificationsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let store: NotificationStore
    var onOpen: (UUID) -> Void

    var body: some View {
        Group {
            if store.isLoading && store.items.isEmpty {
                ProgressView().tint(Color.irukaBlue).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.items.isEmpty {
                Text(L(store.failed ? "通知を読み込めませんでした。" : "通知はありません"))
                    .font(.system(size: 15))
                    .foregroundStyle(Color.irukaSecondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(store.items) { item in
                            row(item)
                            Rectangle().fill(Color.irukaHairline).frame(height: 1)
                        }
                    }
                }
                .scrollIndicators(.hidden)
            }
        }
        .background(Color.irukaBackground)
        .refreshable { await store.refresh(userId: auth.user?.id) }
        .task {
            await store.refresh(userId: auth.user?.id)
            try? await Task.sleep(for: .seconds(1.5))
            await store.markRead()
        }
    }

    private func row(_ item: AppNotification) -> some View {
        let profile = store.profiles[item.actorId]
        let name = profile?.name ?? L("ユーザー")
        return Button { onOpen(item.targetId) } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: symbol(item.kind))
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(tint(item.kind))
                    .frame(width: 24, height: 28)
                VStack(alignment: .leading, spacing: 4) {
                    AvatarView(initial: String(name.prefix(1)), index: 0, url: profile?.avatarUrl, size: 32)
                    Text("\(Text(name).bold())\(Text(L(label(item.kind)))) · \(Text(TweetAge.label(for: item.createdAt, language: language)).foregroundStyle(Color.irukaSecondary))")
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaInk)
                        .multilineTextAlignment(.leading)
                    Text(item.body)
                        .font(.system(size: 15))
                        .foregroundStyle(Color.irukaSecondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(item.isNew ? Color.irukaBlue.opacity(0.06) : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func symbol(_ kind: String) -> String {
        switch kind {
        case "like": "heart.fill"
        case "repost": "arrow.2.squarepath"
        case "reply": "bubble.left"
        default: "quote.bubble"
        }
    }

    private func tint(_ kind: String) -> Color {
        switch kind {
        case "like": Color(red: 0.976, green: 0.094, blue: 0.502)
        case "repost": Color(red: 0, green: 0.729, blue: 0.486)
        default: Color.irukaBlue
        }
    }

    private func label(_ kind: String) -> String {
        switch kind {
        case "like": "があなたの投稿にいいねしました"
        case "repost": "があなたの投稿をリポストしました"
        case "reply": "があなたの投稿に返信しました"
        default: "があなたの投稿を引用しました"
        }
    }
}
