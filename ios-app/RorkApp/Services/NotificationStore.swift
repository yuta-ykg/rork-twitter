import Foundation
import Observation
import Supabase

@MainActor
@Observable
final class NotificationStore {
    private(set) var rows: [NotificationRow] = []
    private(set) var loading = false
    private(set) var loadingMore = false
    private(set) var marking = false
    private(set) var hasMore = false
    var error: String?
    var readError: String?
    private var userId: String?
    private var generation = 0
    var unreadCount: Int { rows.first?.unreadCount ?? 0 }

    func configure(userId: String?) {
        guard self.userId != userId else { return }
        self.userId = userId
        generation += 1
        rows = []; loading = false; loadingMore = false; marking = false
        hasMore = false; error = nil; readError = nil
    }

    func refresh() async {
        guard let userId, !DevelopmentData.isActive, !loading, !loadingMore, !marking else { return }
        let epoch = generation
        loading = rows.isEmpty
        loadingMore = true
        defer { if generation == epoch { loading = false; loadingMore = false } }
        do {
            let result: [NotificationRow] = try await IrukaDatabase.client
                .rpc("get_notifications", params: NotificationQueryParams(expected_user_id: userId, before_created_at: nil, before_id: nil))
                .execute().value
            guard generation == epoch, !Task.isCancelled else { return }
            rows = result; hasMore = result.count == 50; error = nil
        } catch {
            if generation == epoch, !Task.isCancelled { self.error = "通知を読み込めませんでした。" }
        }
    }

    func loadMore() async {
        guard let userId, hasMore, let last = rows.last, !loadingMore, !marking else { return }
        let epoch = generation
        loadingMore = true
        defer { if generation == epoch { loadingMore = false } }
        do {
            let result: [NotificationRow] = try await IrukaDatabase.client
                .rpc("get_notifications", params: NotificationQueryParams(expected_user_id: userId, before_created_at: last.createdAt, before_id: last.id))
                .execute().value
            guard generation == epoch, !Task.isCancelled else { return }
            let existing = Set(rows.map(\.id))
            rows += result.filter { !existing.contains($0.id) }
            hasMore = result.count == 50; error = nil
        } catch {
            if generation == epoch { self.error = "通知を読み込めませんでした。" }
        }
    }

    func markRead(_ id: UUID) async { await mark(id: id) }
    func markAllRead() async { await mark(id: nil) }

    private func mark(id: UUID?) async {
        guard let userId, !DevelopmentData.isActive, !marking, !loadingMore else { return }
        let epoch = generation
        marking = true; readError = nil
        do {
            if let id, let row = rows.first(where: { $0.id == id }) {
                if row.isGrouped {
                    try await IrukaDatabase.client.rpc("mark_post_notifications_read", params: GroupNotificationReadParams(target_post_id: row.postId, before_time: row.createdAt, expected_user_id: userId)).execute()
                } else {
                    try await IrukaDatabase.client.rpc("mark_notifications_read", params: NotificationReadParams(notification_ids: [row.id], expected_user_id: userId)).execute()
                }
            } else if id == nil, let first = rows.first {
                try await IrukaDatabase.client.rpc("mark_all_notifications_read", params: NotificationReadAllParams(before_time: first.createdAt, expected_user_id: userId)).execute()
            }
            guard generation == epoch else { return }
            marking = false
            await refresh()
        } catch {
            if generation == epoch { readError = "通知を既読にできませんでした。"; marking = false }
        }
    }
}

