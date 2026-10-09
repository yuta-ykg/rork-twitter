import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class NotificationStore {
    private(set) var items: [AppNotification] = []
    private(set) var profiles: [String: IrukaProfile] = [:]
    private(set) var isLoading = false
    private(set) var failed = false
    private var userId: String?

    var hasUnread: Bool { items.contains(where: \.isNew) }

    func refresh(userId: String?) async {
        self.userId = userId
        guard let userId else { items = []; return }
        if items.isEmpty { isLoading = true }
        defer { isLoading = false }
        do {
            let rows: [AppNotification] = try await IrukaDatabase.client
                .rpc("get_notifications", params: ExpectedUserParams(expected_user_id: userId))
                .execute().value
            let found = (try? await ProfileService.fetch(ids: rows.map(\.actorId))) ?? []
            guard self.userId == userId else { return }
            profiles = Dictionary(found.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
            items = rows
            failed = false
        } catch {
            failed = true
        }
    }

    /// ここまでを既読にし、未読ドットを消す。
    func markRead() async {
        guard let userId, hasUnread else { return }
        do {
            try await IrukaDatabase.client
                .rpc("mark_notifications_read", params: ExpectedUserParams(expected_user_id: userId))
                .execute()
            items = items.map {
                AppNotification(kind: $0.kind, actorId: $0.actorId, postId: $0.postId, refPostId: $0.refPostId,
                                body: $0.body, createdAt: $0.createdAt, isNew: false)
            }
        } catch {
            return
        }
    }
}
