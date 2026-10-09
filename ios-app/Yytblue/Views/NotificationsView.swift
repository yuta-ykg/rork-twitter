import SwiftUI

/// 通知タブ。フラットな行で、未読は薄い青の背景にする。
enum NotificationFilter: String, CaseIterable, Identifiable {
    case all, like, repost, reply

    var id: String { rawValue }
    var title: String {
        switch self {
        case .all: "すべて"
        case .like: "いいね"
        case .repost: "リポスト"
        case .reply: "返信・引用"
        }
    }

    func includes(_ kind: String) -> Bool {
        switch self {
        case .all: true
        case .like: kind == "like"
        case .repost: kind == "repost"
        case .reply: kind == "reply" || kind == "quote"
        }
    }
}

struct NotificationsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let store: NotificationStore
    var onOpen: (UUID) -> Void
    @State private var filter: NotificationFilter = .all

    private var visibleItems: [AppNotification] {
        store.items.filter { filter.includes($0.kind) }
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar
            content
        }
        .background(Color.irukaBackground)
    }

    private var filterBar: some View {
        HStack(spacing: 0) {
            ForEach(NotificationFilter.allCases) { entry in
                Button { filter = entry } label: {
                    Text(L(entry.title))
                        .font(.system(size: 15, weight: filter == entry ? .bold : .medium))
                        .foregroundStyle(filter == entry ? Color.irukaInk : Color.irukaSecondary)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .overlay(alignment: .bottom) {
                            if filter == entry {
                                Capsule().fill(Color.irukaBlue).frame(width: 48, height: 4)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .overlay(alignment: .bottom) { Rectangle().fill(Color.irukaHairline).frame(height: 1) }
    }

    private var content: some View {
        Group {
            if store.isLoading && store.items.isEmpty {
                ProgressView().tint(Color.irukaBlue).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if visibleItems.isEmpty && store.hasMore {
                ProgressView().tint(Color.irukaBlue).frame(maxWidth: .infinity, maxHeight: .infinity)
                    .onAppear { Task { await store.loadMore() } }
            } else if visibleItems.isEmpty {
                Text(L(store.failed ? "通知を読み込めませんでした。" : "通知はありません"))
                    .font(.system(size: 15))
                    .foregroundStyle(Color.irukaSecondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(visibleItems) { item in
                            row(item)
                                .onAppear {
                                    if item.id == visibleItems.last?.id { Task { await store.loadMore() } }
                                }
                            Rectangle().fill(Color.irukaHairline).frame(height: 1)
                        }
                        if store.hasMore {
                            ProgressView().tint(Color.irukaBlue).frame(maxWidth: .infinity, minHeight: 56)
                                .onAppear { Task { await store.loadMore() } }
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
